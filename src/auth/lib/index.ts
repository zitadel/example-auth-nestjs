import Zitadel from '@auth/core/providers/zitadel';
import { randomUUID } from 'crypto';
import * as oidc from 'openid-client';
import type { JWT } from '@auth/core/jwt';
import { Account, Profile, User } from '@auth/core/types';
import { ZITADEL_SCOPES } from './scopes.js';
import { AdapterUser } from '@auth/core/adapters';
import config from './config.js';
import { IAuthModuleOptions, Session } from '@zitadel/nestjs-auth';

/**
 * Automatically refreshes an expired access token using the refresh token.
 *
 * When a user's access token expires (typically after 1 hour), this function
 * seamlessly exchanges the refresh token for a new access token, allowing the
 * user to continue using the application without having to log in again.
 *
 * This is essential for maintaining long-lived sessions and preventing users
 * from being unexpectedly logged out during active use of the application.
 *
 * ## How Token Refresh Works
 *
 * 1. **Token Expiry Detection**: Auth.js automatically checks if the access token has expired
 * 2. **Refresh Request**: Uses the refresh token to request new tokens from ZITADEL
 * 3. **Token Update**: Updates the JWT with the new access token and expiry time
 * 4. **Seamless Experience**: User continues without interruption
 *
 * ## Error Handling
 *
 * If the refresh fails (e.g., refresh token expired, user permissions revoked),
 * the function sets an error flag that forces the user to sign in again.
 *
 * @param token - The current JWT containing the refresh token and other session data
 * @returns Promise resolving to updated JWT with new tokens or error state
 */
async function refreshAccessToken(token: JWT): Promise<JWT> {
  if (!token.refreshToken) {
    console.error('No refresh token available for refresh');
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }

  try {
    const oidcConfig = await oidc.discovery(
      new URL(config.ZITADEL_DOMAIN),
      config.ZITADEL_CLIENT_ID,
      config.ZITADEL_CLIENT_SECRET,
    );

    const tokenEndpointResponse = await oidc.refreshTokenGrant(
      oidcConfig,
      token.refreshToken as string,
    );

    return {
      ...token,
      accessToken: tokenEndpointResponse.access_token,
      expiresAt: tokenEndpointResponse.expires_in
        ? Date.now() + tokenEndpointResponse.expires_in * 1000
        : Date.now() + 3600 * 1000,
      refreshToken: tokenEndpointResponse.refresh_token ?? token.refreshToken,
      error: undefined,
    };
  } catch (error: unknown) {
    console.error('Token refresh failed:', error);
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}

/**
 * Constructs a secure logout URL for ZITADEL with CSRF protection.
 *
 * This function creates a proper logout URL that terminates the user's session
 * both in your application and in ZITADEL. It includes security measures to
 * prevent Cross-Site Request Forgery (CSRF) attacks during the logout process.
 *
 * ## Security Features
 *
 * - **State Parameter**: Random UUID for CSRF protection
 * - **ID Token Hint**: Tells ZITADEL which session to terminate
 * - **Post-Logout Redirect**: Where to send the user after logout
 *
 * ## Logout Flow
 *
 * 1. User clicks "logout" in your app
 * 2. Your app calls this function to get the logout URL
 * 3. User is redirected to ZITADEL's logout endpoint
 * 4. ZITADEL terminates the session and redirects back to your app
 * 5. Your app validates the state parameter for security
 *
 * @param idToken - The user's ID token from their current session (used to identify which session to terminate)
 * @returns Promise containing the logout URL to redirect to and state value for validation
 */
export async function buildLogoutUrl(
  idToken: string,
): Promise<{ url: string; state: string }> {
  const oidcConfig = await oidc.discovery(
    new URL(config.ZITADEL_DOMAIN),
    config.ZITADEL_CLIENT_ID,
    config.ZITADEL_CLIENT_SECRET,
  );

  const state: string = randomUUID();
  const urlObj = oidc.buildEndSessionUrl(oidcConfig, {
    id_token_hint: idToken,
    post_logout_redirect_uri: config.ZITADEL_POST_LOGOUT_URL,
    state,
  });

  return { url: urlObj.toString(), state };
}

/**
 * Complete Auth.js configuration for ZITADEL authentication with token refresh.
 *
 * This configuration implements the industry-standard OAuth 2.0 Authorization Code
 * Flow with PKCE (Proof Key for Code Exchange) for maximum security. It includes
 * automatic token refresh to maintain long-lived user sessions.
 */
export const authConfig: IAuthModuleOptions = {
  providers: [
    Zitadel({
      issuer: config.ZITADEL_DOMAIN,
      clientId: config.ZITADEL_CLIENT_ID,
      clientSecret: config.ZITADEL_CLIENT_SECRET,
      authorization: {
        params: {
          scope: ZITADEL_SCOPES,
        },
      },
    }),
  ],

  trustHost: true,
  session: {
    strategy: 'jwt',
    maxAge: Number(config.SESSION_DURATION) || 3600,
  },

  secret: config.SESSION_SECRET,

  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },

  callbacks: {
    /**
     * Controls where users are redirected after successful authentication.
     *
     * @param options.baseUrl - Your application's base URL
     * @returns The URL to redirect the user to after successful login
     */
    async redirect(options: { baseUrl: string }): Promise<string> {
      return `${options.baseUrl}/profile`;
    },

    /**
     * This callback is called whenever a JSON Web Token is created (i.e. at sign in)
     * or updated (i.e whenever a session is accessed in the client). Anything you
     * return here will be saved in the JWT and forwarded to the session callback.
     * There you can control what should be returned to the client. Anything else
     * will be kept from your frontend. The JWT is encrypted by default via your
     * AUTH_SECRET environment variable.
     *
     * @param params.token      - When `trigger` is `"signIn"` or `"signUp"`, it will
     *                             be a subset of {@link JWT}. Otherwise, it will
     *                             be the full {@link JWT} for subsequent calls.
     * @param params.user       - Either the result of the OAuth profile or the
     *                             credentials authorize callback. Always present
     *                             on sign-in/up.
     * @param params.account    - Info about the provider and token-set.
     *                             Only on `"signIn"`/`"signUp"`.
     * @param params.profile    - Raw provider profile (OIDC = decoded ID token or
     *                             /userinfo). Only on `"signIn"`.
     * @param params.trigger    - Why the callback ran: `"signIn"`, `"signUp"`,
     *                             or `"update"`.
     * @param params.isNewUser  - @deprecated use `trigger === "signUp"` instead.
     * @param params.session    - When using `session.strategy: "jwt"`, the data
     *                             sent from `useSession().update`. ⚠ Validate it!
     *
     * @returns A {@link JWT} or `null` to stop the sign‐in.
     */
    async jwt(params: {
      token: JWT;
      account?: Account | null;
      user: User | AdapterUser;
      profile?: Profile;
      trigger?: 'signIn' | 'signUp' | 'update';
      isNewUser?: boolean;
      session?: Session;
    }): Promise<JWT> {
      const { token, account, user } = params;

      if (account && user) {
        return {
          ...token,
          idToken: account.id_token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at
            ? account.expires_at * 1000
            : Date.now() + 3600 * 1000,
          error: undefined,
        };
      }

      if (Date.now() < (token.expiresAt as number)) {
        return token;
      }

      return refreshAccessToken(token);
    },

    /**
     * Shapes the session object that your application receives.
     *
     * @param params.session - The base session object
     * @param params.token - The JWT token containing all stored data
     */
    async session({ session, token }) {
      if (typeof token.idToken === 'string') {
        session.idToken = token.idToken;
      }
      if (typeof token.accessToken === 'string') {
        session.accessToken = token.accessToken;
      }
      if (typeof token.error === 'string') {
        session.error = token.error;
      }
      return session;
    },
  },
};
