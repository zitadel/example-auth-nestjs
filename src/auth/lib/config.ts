/**
 * Defines the shape of the configuration variables used throughout the
 * application.
 */
interface Config {
  /**
   * The base domain of your ZITADEL instance. This is the URL of your
   * ZITADEL organization (e.g., 'https://issuer.zitadel.cloud').
   */
  ZITADEL_DOMAIN: string;
  /**
   * The client ID for your OIDC application, which you can find in the
   * ZITADEL Console for your specific project and application.
   */
  ZITADEL_CLIENT_ID: string;
  /**
   * The client secret for your OIDC application. This is only required
   * for confidential clients (like web servers) and should be kept
   * secure.
   */
  ZITADEL_CLIENT_SECRET?: string;
  /**
   * The full URL where ZITADEL will redirect back to after a successful
   * authentication. This must exactly match one of the redirect URIs
   * configured in your ZITADEL application.
   */
  ZITADEL_CALLBACK_URL: string;
  /**
   * The URL to which the user will be redirected after a successful
   * login. If not provided, it defaults to '/profile'.
   */
  ZITADEL_POST_LOGIN_URL?: string;
  /**
   * The URL to which the user will be redirected after they have logged
   * out from ZITADEL. This must match a post-logout URI in your
   * ZITADEL application settings.
   */
  ZITADEL_POST_LOGOUT_URL: string;
  /**
   * A long, random, and secret string used to sign the session cookie.
   * This should be at least 32 characters long and kept private.
   */
  SESSION_SECRET: string;
  /**
   * A cryptographic salt used in combination with the session secret to
   * derive the encryption keys for the session cookie. This should be a
   * random string of at least 16 characters.
   */
  SESSION_SALT: string;
  /**
   * The duration of the session in milliseconds. This determines how
   * long a user's session will remain valid. Defaults to 1 hour
   * (3,600,000 ms).
   */
  SESSION_DURATION: number;
  /**
   * The network port on which the NestJS server will listen for
   * incoming connections. Defaults to 3000 if not specified.
   */
  PORT: string;
  /**
   * The environment in which the application is running, typically
   * 'development' or 'production'. This is used to enable or disable
   * certain features, like secure cookies.
   */
  NODE_ENV?: string;
  /**
   * The path for which the session cookie is valid.
   */
  SESSION_COOKIE_PATH: string;
  /**
   * Determines if the session cookie should only be sent over HTTPS.
   */
  SESSION_COOKIE_SECURE: boolean;
}

/**
 * A helper function that retrieves a configuration variable and throws
 * an error if it is not defined, ensuring that all required variables
 * are present at startup.
 *
 * @param k - The key of the environment variable to retrieve.
 * @returns The value of the environment variable.
 * @throws An error if the environment variable is missing.
 */
function must<K extends keyof Config>(k: K): string {
  const v = process.env[k];
  if (!v) throw new Error(`❌ Missing required env var ${k}`);
  return v;
}

/**
 * A strongly-typed and validated object that holds all configuration
 * variables for the application. It reads from `process.env` and
 * ensures that all required variables are present.
 */
const config: Required<
  Pick<
    Config,
    | 'ZITADEL_DOMAIN'
    | 'ZITADEL_CLIENT_ID'
    | 'ZITADEL_CALLBACK_URL'
    | 'ZITADEL_POST_LOGOUT_URL'
    | 'SESSION_SECRET'
    | 'SESSION_SALT'
    | 'SESSION_COOKIE_PATH'
    | 'SESSION_COOKIE_SECURE'
  >
> &
  Config = {
  ZITADEL_DOMAIN: new URL(must('ZITADEL_DOMAIN')).origin,
  ZITADEL_CLIENT_ID: must('ZITADEL_CLIENT_ID'),
  ZITADEL_CLIENT_SECRET: process.env.ZITADEL_CLIENT_SECRET,
  ZITADEL_CALLBACK_URL: must('ZITADEL_CALLBACK_URL'),
  ZITADEL_POST_LOGIN_URL: process.env.ZITADEL_POST_LOGIN_URL ?? '/profile',
  ZITADEL_POST_LOGOUT_URL: process.env.ZITADEL_POST_LOGOUT_URL ?? '/',
  SESSION_SECRET: must('SESSION_SECRET'),
  SESSION_SALT: must('SESSION_SALT'),
  SESSION_DURATION: Number(process.env.SESSION_DURATION ?? '3600000'),
  PORT: process.env.PORT ?? '3000',
  NODE_ENV: process.env.NODE_ENV,
  SESSION_COOKIE_PATH: process.env.SESSION_COOKIE_PATH ?? '/',
  SESSION_COOKIE_SECURE: process.env.NODE_ENV === 'production',
};

export default config;
