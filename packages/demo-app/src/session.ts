import type { NextFunction, Request, RequestHandler, Response } from 'express';
// @ts-expect-error since the imports don't work
import type { CookieSessionInterfaces } from 'cookie-session';
import cookieSession from 'cookie-session';

/**
 * Narrow type for the cookie-session payload we mutate. It is the original
 * cookie-session object plus a few optional methods Passport expects.
 */
export type CookieSessionWithShim =
  CookieSessionInterfaces.CookieSessionObject & SessionShim;

/**
 * Methods that `express-session` normally provides and Passport calls. We add
 * light-weight equivalents so Passport does not crash when using cookie-session.
 */
export interface SessionShim {
  /**
   * No-op saver. cookie-session writes automatically at end of response.
   * The callback (if provided) is invoked immediately with no error.
   */
  save?(cb?: (err?: unknown) => void): void;

  /**
   * Regenerate the session to mitigate fixation attacks: drop existing cookie
   * state and start with a fresh empty object. Re-attach shim methods to the
   * new object, then invoke the callback.
   */
  regenerate?(cb?: (err?: unknown) => void): void;

  /**
   * Destroy the session by clearing the cookie (set req.session = null). Call
   * the callback when done.
   */
  destroy?(cb?: (err?: unknown) => void): void;

  /**
   * Optional developer-defined ID for logging/correlation. Not required by
   * Passport or cookie-session.
   */
  sid?: string;
}

/**
 * Options accepted by {@link browserSession}. They are passed straight through
 * to `cookie-session`.
 */
export type ClientSessionOptions = CookieSessionInterfaces.CookieSessionOptions;

/**
 * Create a middleware that installs cookie-session **and** patches each request
 * so Passport can safely call `req.session.regenerate/save/destroy`.
 *
 * Place this middleware **before** `passport.initialize()` / `passport.session()`.
 *
 * ```ts
 * import { clientSession } from './session.js';
 *
 * app.use(clientSession({
 *   name: 'sid',
 *   keys: [config.SESSION_SECRET],
 *   maxAge: 3600_000,
 *   httpOnly: true,
 *   secure: process.env.NODE_ENV === 'production',
 *   sameSite: 'lax',
 * }));
 *
 * app.use(passport.initialize());
 * app.use(passport.session());
 * ```
 *
 * @param options - cookie-session options (name, keys, maxAge, etc.).
 * @returns Express RequestHandler that wires cookie-session and patches it.
 */
export function browserSession(options: ClientSessionOptions): RequestHandler {
  // Build the underlying cookie-session middleware first.
  const base = cookieSession(options);

  // Return a composed middleware that runs cookie-session, then shims.
  return function clientSessionMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): void {
    base(req, res, (err?: unknown) => {
      if (err) return next(err);
      patchSession(req);
      next();
    });
  };
}

/**
 * Patch the current request's session object (if present) with the shim
 * methods. If `regenerate()` is invoked, we recurse to ensure the freshly
 * created object is also patched.
 */
function patchSession(req: Request): void {
  if (!req.session) return;

  const s = req.session as CookieSessionWithShim;

  if (typeof s.save !== 'function') {
    s.save = (cb?: (err?: unknown) => void) => {
      if (cb) cb();
    };
  }

  if (typeof s.destroy !== 'function') {
    s.destroy = (cb?: (err?: unknown) => void) => {
      // `cookie-session` clears cookie when you set req.session = null
      (req as CookieSessionInterfaces.CookieSessionRequest).session = null;
      if (cb) cb();
    };
  }

  if (typeof s.regenerate !== 'function') {
    s.regenerate = (cb?: (err?: unknown) => void) => {
      (req as CookieSessionInterfaces.CookieSessionRequest).session = null; // drop current cookie payload
      (req as CookieSessionInterfaces.CookieSessionRequest).session =
        {} as CookieSessionWithShim; // new empty object
      patchSession(req); // reattach methods
      if (cb) cb();
    };
  }
}
