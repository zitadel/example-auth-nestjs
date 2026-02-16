import { Module } from '@nestjs/common';
import { AuthModule as NestAuthModule } from '@zitadel/nestjs-auth';
import { authConfig } from './lib/index.js';
import { AuthController } from './auth.controller.js';

@Module({
  imports: [
    NestAuthModule.register(authConfig, {
      globalGuard: true,
      rolesGuard: true,
    }),
  ],
  controllers: [AuthController],
})
export class AuthModule {
  //
}
