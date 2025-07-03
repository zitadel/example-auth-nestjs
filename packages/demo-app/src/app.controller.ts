import { Controller, Get, Render, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedGuard } from './auth/guards/authenticated.guard.js';
import { User } from './auth/decorators/user.decorator.js';
import { ZitadelUser } from 'passport-zitadel';
import type { Request } from 'express';

@Controller()
export class AppController {
  @Get()
  @Render('index')
  getHome(@Req() req: Request) {
    return {
      isAuthenticated: req.isAuthenticated(),
      loginUrl: '/auth/login',
    };
  }

  @Get('profile')
  @UseGuards(AuthenticatedGuard)
  @Render('profile')
  getProfile(@User() user: ZitadelUser, @Req() req: Request) {
    return {
      userJson: JSON.stringify(user, null, 2),
      logoutUrl: '/auth/logout',
      isAuthenticated: req.isAuthenticated(),
    };
  }
}
