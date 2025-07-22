import { Controller, Get, Inject, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZitadelStrategy, ZitadelUser } from 'passport-zitadel';
import { AuthenticatedGuard } from './guards/authenticated.guard.js';
import { User } from './decorators/user.decorator.js';
import { ZITADEL_STRATEGY_PROVIDER } from './constants.js';
import { ZitadelAuthGuard } from './guards/zitadel.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(ZITADEL_STRATEGY_PROVIDER)
    private readonly zitadelStrategy: ZitadelStrategy,
  ) {}

  @Get('login')
  @UseGuards(ZitadelAuthGuard)
  public login(): void {}

  /**
   * ✅ FINAL CORRECTED METHOD
   * This handler is now only called AFTER the passport.authenticate middleware
   * (which we will apply in the module) has successfully run and created the session.
   */
  @Get('callback')
  public callback(@Res() res: Response): void {
    res.redirect('/profile');
  }

  @Get('logout')
  @UseGuards(AuthenticatedGuard)
  public logout(
    @Req() req: Request,
    @Res() res: Response,
    @User() user: ZitadelUser | null,
  ): void {
    const id_token_hint = user ? user.id_token : undefined;
    const logoutUrl = this.zitadelStrategy.getLogoutUrl({
      id_token_hint,
      logout_hint: user?.sub,
    });

    req.logout((err: Error) => {
      if (err) {
        res.redirect('/?error=logout_failed');
        return;
      }
      req.session.destroy(() => {
        res.redirect(logoutUrl);
      });
    });
  }
}
