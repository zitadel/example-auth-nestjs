// src/auth/auth.controller.ts
import {
  Controller,
  Get,
  Post,
  Query,
  Res,
  Render,
  HttpStatus,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public, AuthSession as SessionParam } from '@mridang/nestjs-auth';
import type { Session } from '@mridang/nestjs-auth';
import { getMessage } from './message.js';
import { authConfig, buildLogoutUrl } from './lib/index.js';
import config from './lib/config.js';

@Controller('auth')
export class AuthController {
  /**
   * Initiates the logout process by redirecting the user to the external Identity
   * Provider's (IdP) logout endpoint…
   */
  @Post('logout')
  @Public()
  async postLogout(
    @SessionParam() session: Session | null,
    @Res() res: Response,
  ): Promise<void> {
    const idToken = session?.idToken; // available via module augmentation

    if (!idToken) {
      res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'No valid session or ID token found' });
      return;
    }

    const { url, state } = await buildLogoutUrl(idToken);

    res.cookie('logout_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/logout/callback',
    });

    res.redirect(url);
  }

  /**
   * Handles the callback from an external Identity Provider (IdP) after a user
   * signs out. This endpoint is responsible for validating the logout request to
   * prevent Cross-Site Request Forgery (CSRF) attacks by comparing a `state`
   * parameter from the URL with a value stored in a secure, server-side cookie.
   * If validation is successful, it clears the user's session cookies and
   * redirects to a success page. Otherwise, it redirects to an error page.
   *
   * @param req - The Express request object, which contains the query parameters
   *              and cookies.
   * @param res - The Express response object, which is used to set headers and
   *              redirect the user.
   */
  @Get('logout/callback')
  @Public()
  logoutCallback(@Req() req: Request, @Res() res: Response): void {
    const state: string | undefined = req.query.state as string | undefined;
    const reqWithCookies = req as Request & {
      cookies?: Record<string, string>;
    };
    const logoutStateCookie: string | undefined =
      reqWithCookies.cookies?.logout_state;

    if (state && logoutStateCookie && state === logoutStateCookie) {
      res.header('Clear-Site-Data', '"cookies"');
      res.redirect('/auth/logout/success');
      return;
    } else {
      const reason: string = encodeURIComponent(
        'Invalid or missing state parameter.',
      );
      res.redirect(`/auth/logout/error?reason=${reason}`);
      return;
    }
  }

  /**
   * GET /auth/login … (unchanged)
   */
  @Get('login')
  @Public()
  @Render('auth/login')
  getSignin(
    @Query('callbackUrl') callbackUrl?: string,
    @Query('error') error?: string,
  ): {
    providers: { id: string; name: string; signinUrl: string }[];
    callbackUrl?: string;
    message: unknown;
  } {
    return {
      providers: authConfig.providers.map((provider: unknown) => {
        const cfg = typeof provider === 'function' ? provider() : provider;
        return {
          id: cfg.id,
          name: cfg.name,
          signinUrl: `/auth/signin/${cfg.id}`,
        };
      }),
      callbackUrl,
      message: getMessage(error, 'signin-error'),
    };
  }

  /**
   * GET /auth/error … (unchanged)
   */
  @Get('error')
  @Public()
  @Render('auth/error')
  getAuthError(@Query('error') error?: string): {
    heading: string;
    message: string;
  } {
    const { heading, message } = getMessage(error, 'auth-error');
    return { heading, message };
  }

  /**
   * ZITADEL UserInfo endpoint …
   */
  @Get('userinfo')
  async userInfo(
    @SessionParam() session: Session | null,
    @Res() res: Response,
  ): Promise<void> {
    if (!session) {
      res.status(HttpStatus.UNAUTHORIZED).json({ error: 'Unauthorized' });
      return;
    }

    const accessToken = session.accessToken; // via module augmentation
    if (!accessToken) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'No access token available' });
      return;
    }

    try {
      const idpRes = await fetch(`${config.ZITADEL_DOMAIN}/oidc/v1/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!idpRes.ok) {
        res
          .status(idpRes.status)
          .json({ error: `UserInfo API error: ${idpRes.status}` });
        return;
      }

      const userInfo = await idpRes.json();
      res.json(userInfo);
    } catch {
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to fetch user info' });
    }
  }

  /**
   * GET /auth/logout/success … (unchanged)
   */
  @Get('logout/success')
  @Public()
  @Render('auth/logout/success')
  logoutSuccess(): Record<string, never> {
    return {};
  }

  /**
   * GET /auth/logout/error … (unchanged)
   */
  @Get('logout/error')
  @Public()
  @Render('auth/logout/error')
  logoutError(@Query('reason') reason?: string): { reason: string } {
    return { reason: reason || 'An unknown error occurred.' };
  }
}
