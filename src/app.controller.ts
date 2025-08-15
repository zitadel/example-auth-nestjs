import { Controller, Get, Render } from '@nestjs/common';
import { Public, AuthSession } from '@mridang/nestjs-auth';
import type { Session } from '@mridang/nestjs-auth';

@Controller()
export class AppController {
  @Get()
  @Public()
  @Render('index')
  getHome(@AuthSession() session: Session | null) {
    return {
      isAuthenticated: Boolean(session?.user),
      loginUrl: '/auth/signin/zitadel',
    };
  }

  @Get('profile')
  @Render('profile')
  getProfile(@AuthSession() session: Session | null) {
    return {
      userJson: JSON.stringify(session?.user ?? null, null, 2),
      logoutUrl: '/auth/logout',
      isAuthenticated: Boolean(session?.user),
    };
  }
}
