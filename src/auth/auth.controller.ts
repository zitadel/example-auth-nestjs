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
import { getMessage } from './lib/message.js';
import { authConfig, buildLogoutUrl } from './lib/index.js';
import config from './lib/config.js';

@Controller('auth')
export class AuthController {
  /**
   * Initiates the logout process by redirecting the user to the external Identity
   * Provider's (IdP) logout endpoint. This endpoint validates that the user has an
   * active session with a valid ID token, generates a cryptographically secure state
   * parameter for CSRF protection, and stores it in a secure HTTP-only cookie.
   *
   * The state parameter will be validated upon the user's return from the IdP to
   * ensure the logout callback is legitimate and not a forged request.
   *
   * @returns A redirect response to the IdP's logout URL on success, or a 400-error
   * response if no valid session exists. The response includes a secure state cookie
   * that will be validated in the logout callback.
   */
  @Post('logout')
  @Public()
  async postLogout(
    @SessionParam() session: Session | null,
    @Res() res: Response,
  ): Promise<void> {
    const idToken = session?.idToken;

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
   * GET /auth/signin
   *
   * Renders a custom sign-in page that displays available authentication providers
   * and handles authentication errors with user-friendly messaging. This page is
   * shown when users need to authenticate, either by visiting directly or after
   * being redirected from protected routes via the requireAuth middleware.
   *
   * The sign-in page provides a branded authentication experience that matches the
   * application's design system, rather than using Auth.js default pages. It
   * supports error display, callback URL preservation, and CSRF protection via
   * client-side JavaScript.
   *
   * Authentication flow:
   * 1. User visits protected route without session
   * 2. requireAuth redirects to /auth/signin?callbackUrl=<original-url>
   * 3. This route renders custom sign-in page with available providers
   * 4. User selects provider, CSRF token is fetched and added via JavaScript
   * 5. Form submits to /auth/signin/[provider] to initiate OAuth flow
   * 6. After successful authentication, user is redirected to callbackUrl
   *
   * Error handling supports all Auth.js error types including AccessDenied,
   * Configuration, OAuthCallback, and others, displaying contextual messages
   * via the getMessage utility function.
   *
   * The page specifically looks for the 'zitadel' provider to match the original
   * implementation behavior, showing only that provider's sign-in option even
   * if multiple providers are configured.
   *
   * @param callbackUrl - URL to redirect after successful authentication (optional)
   * @param error - Auth.js error code for display (optional)
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
      message: error ? getMessage(error, 'signin-error') : undefined,
    };
  }

  /**
   * GET /auth/error
   *
   * Intercepts authentication-related errors (e.g. AccessDenied, Configuration,
   * Verification) from sign-in or callback flows and shows a friendly error page.
   *
   * @param error - The error query parameter from the request
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
   * ZITADEL UserInfo endpoint
   *
   * Fetches extended user information from ZITADEL's UserInfo endpoint using the
   * current session's access token. Provides real-time user data including roles,
   * custom attributes, and organization membership that may not be in the cached session.
   *
   * @param session - The current session object from NestJS auth
   * @param res - The Express response object
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
    const token = session.accessToken;
    if (!token) {
      res
        .status(HttpStatus.UNAUTHORIZED)
        .json({ error: 'No access token available' });
      return;
    }
    try {
      const idpRes = await fetch(`${config.ZITADEL_DOMAIN}/oidc/v1/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!idpRes.ok) {
        res
          .status(idpRes.status)
          .json({ error: `UserInfo API error: ${idpRes.status}` });
        return;
      }
      const userInfo = await idpRes.json();
      res.json(userInfo);
    } catch (err) {
      console.error('UserInfo fetch failed:', err);
      res
        .status(HttpStatus.INTERNAL_SERVER_ERROR)
        .json({ error: 'Failed to fetch user info' });
    }
  }

  /**
   * GET /auth/logout/success
   *
   * Renders a confirmation page indicating the user has successfully logged out.
   * After displaying a success message, the template may include client-side logic
   * to redirect the user back to the home page after a short delay.
   *
   * (No parameters - uses decorators)
   */
  @Get('logout/success')
  @Public()
  @Render('auth/logout/success')
  logoutSuccess(): Record<string, never> {
    return {};
  }

  /**
   * GET /auth/logout/error
   *
   * Displays a user-friendly error page for failed logout attempts. This page is
   * typically shown when a security check fails during the logout process,
   * commonly due to a CSRF protection failure where the `state` parameter from
   * the identity provider does not match the one stored securely in session.
   *
   * @param reason - The reason query parameter for the logout error
   */
  @Get('logout/error')
  @Public()
  @Render('auth/logout/error')
  logoutError(@Query('reason') reason?: string): { reason: string } {
    return { reason: reason || 'An unknown error occurred.' };
  }
}
