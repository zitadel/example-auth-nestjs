import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import { ZitadelUser } from 'passport-zitadel';

/**
 * A parameter decorator to extract the authenticated user object from the
 * request.
 */
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ZitadelUser | null => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request.user as ZitadelUser) ?? null;
  },
);
