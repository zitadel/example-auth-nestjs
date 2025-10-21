// noinspection JSUnusedGlobalSymbols
export default async () => {
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3000';
  process.env.SESSION_SALT = 3927993513644645;
  process.env.SESSION_SECRET = 'test-session-secret-key-for-testing-only';
  process.env.SESSION_DURATION = '3600';
  process.env.ZITADEL_DOMAIN = 'https://test-zitadel-domain.zitadel.cloud';
  process.env.ZITADEL_CLIENT_ID = 'test-client-id';
  process.env.ZITADEL_CLIENT_SECRET = 'test-client-secret';
  process.env.ZITADEL_CALLBACK_URL = 'http://localhost:3000/auth/callback';
  process.env.ZITADEL_POST_LOGIN_URL = '/profile';
  process.env.ZITADEL_POST_LOGOUT_URL = 'http://localhost:3000';
};
