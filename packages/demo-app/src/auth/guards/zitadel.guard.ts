import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ZITADEL_STRATEGY_NAME } from '../constants.js';

/**
 * A guard that invokes the ZITADEL authentication strategy, initiating the
 * OIDC login flow.
 */
@Injectable()
export class ZitadelAuthGuard extends AuthGuard(ZITADEL_STRATEGY_NAME) {}
