import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import passport from 'passport';
import { ZitadelStrategy, ZitadelUser } from 'passport-zitadel';
import config from '../config.js';
import { AuthController } from './auth.controller.js';
import {
  ZITADEL_STRATEGY_NAME,
  ZITADEL_STRATEGY_PROVIDER,
} from './constants.js';
import { AuthenticatedGuard } from './guards/authenticated.guard.js';
import { ZitadelAuthGuard } from './guards/zitadel.guard.js';
import { ZITADEL_SCOPES } from './scopes.js';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [
    {
      provide: ZITADEL_STRATEGY_PROVIDER,
      useFactory: async () => {
        const strategy = await ZitadelStrategy.discover({
          domain: config.ZITADEL_DOMAIN,
          clientId: config.ZITADEL_CLIENT_ID,
          clientSecret: config.ZITADEL_CLIENT_SECRET,
          callbackURL: config.ZITADEL_CALLBACK_URL,
          scope: ZITADEL_SCOPES,
          postLogoutRedirectUrl: config.ZITADEL_POST_LOGOUT_URL,
        });

        passport.use(ZITADEL_STRATEGY_NAME, strategy);

        // @ts-expect-error
        passport.serializeUser((user: ZitadelUser, done) => {
          done(null, user);
        });

        passport.deserializeUser((user: ZitadelUser, done) => {
          done(null, user);
        });

        return strategy;
      },
    },
    AuthenticatedGuard,
    ZitadelAuthGuard,
  ],
  exports: [AuthenticatedGuard],
})
export class AuthModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(passport.authenticate(ZITADEL_STRATEGY_NAME, { session: true }))
      .forRoutes('auth/callback');
  }
}
