# NestJS with ZITADEL

[NestJS](https://nestjs.com/) is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications. It uses modern JavaScript, is built with TypeScript, and combines elements of Object Oriented Programming, Functional Programming, and Functional Reactive Programming. NestJS provides a robust architecture with modules, controllers, and dependency injection out of the box.

To secure such an application, you need a reliable way to handle user logins. For the NestJS ecosystem, this example uses [@mridang/nestjs-auth](https://github.com/mridang/nestjs-auth), a NestJS wrapper around [Auth.js](https://authjs.dev/) (formerly NextAuth.js). Think of it as a flexible security guard for your app. This guide demonstrates how to use Auth.js with a NestJS application to implement a secure login with ZITADEL.

We'll be using the **OpenID Connect (OIDC)** protocol with the **Authorization Code Flow + PKCE**. This is the industry-best practice for security, ensuring that the login process is safe from start to finish. You can learn more in our [guide to OAuth 2.0 recommended flows](https://zitadel.com/docs/guides/integrate/login/oidc/oauth-recommended-flows).

This example uses **@mridang/nestjs-auth**, which integrates Auth.js seamlessly into NestJS applications. While ZITADEL doesn't offer a specific SDK, Auth.js is highly modular. It works with a "provider" that handles the communication with ZITADEL. Under the hood, this example uses the powerful OIDC standard to manage the secure PKCE flow.

Check out our Example Application to see it in action.

## Example Application

The example repository includes a complete NestJS application, ready to run, that demonstrates how to integrate ZITADEL for user authentication.

This example application showcases a typical web app authentication pattern: users start on a public landing page, click a login button to authenticate with ZITADEL, and are then redirected to a protected profile page displaying their user information. The app also includes secure logout functionality that clears the session and redirects users back to ZITADEL's logout endpoint. All protected routes are automatically secured using NestJS Guards and session management, ensuring only authenticated users can access sensitive areas of your application.

### Prerequisites

Before you begin, ensure you have the following:

#### System Requirements

- Node.js (v20 or later is recommended)
- npm, yarn, or pnpm package manager

#### Account Setup

You'll need a ZITADEL account and application configured. Follow the [ZITADEL documentation on creating applications](https://zitadel.com/docs/guides/integrate/login/oidc/web-app) to set up your account and create a Web application with Authorization Code + PKCE flow.

> **Important:** Configure the following URLs in your ZITADEL application settings:
>
> - **Redirect URIs:** Add `http://localhost:3000/auth/callback` (for development)
> - **Post Logout Redirect URIs:** Add `http://localhost:3000/auth/logout/callback` (for development)
>
> These URLs must exactly match what your NestJS application uses. For production, add your production URLs.

### Configuration

To run the application, you first need to copy the `.env.example` file to a new file named `.env.local` and fill in your ZITADEL application credentials.

```dotenv
# The environment in which the application is running. This should be set to
# 'production' on your live server to enable security features like secure
# cookies. For local development, 'development' is appropriate.
NODE_ENV=development

# The network port on which the NestJS server will listen for incoming
# connections. Change this if port 3000 is already in use on your system.
PORT=3000

# A long, random, and secret string used to sign the session cookie. This
# prevents the cookie from being tampered with. It must be kept private.
# Generate a secure key using:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="your-very-secret-and-strong-session-key"

# A cryptographic salt used in combination with the session secret to
# derive the encryption keys for the session cookie. This should be a
# random string of at least 16 characters.
# Generate a secure salt using:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SALT="your-very-secret-and-strong-session-salt"

# The total duration of the session in milliseconds. After this period of
# inactivity, the user will be effectively logged out.
# Default is 3600000, which is 1 hour (60 * 60 * 1000).
SESSION_DURATION=3600000

# Your ZITADEL instance domain URL. Found in your ZITADEL console under
# instance settings. Include the full https:// URL.
# Example: https://my-company-abc123.zitadel.cloud
ZITADEL_DOMAIN="https://your-zitadel-domain"

# Application Client ID from your ZITADEL application settings. This unique
# identifier tells ZITADEL which application is making the authentication
# request.
ZITADEL_CLIENT_ID="your-client-id"

# The Client Secret for your application. This is only required if you have
# configured your ZITADEL application as "Confidential". For public clients,
# like single-page apps, this can be left empty.
ZITADEL_CLIENT_SECRET=""

# OAuth callback URL where ZITADEL redirects after user authentication. This
# MUST exactly match a Redirect URI configured in your ZITADEL application.
ZITADEL_CALLBACK_URL="http://localhost:3000/auth/callback"

# The internal URL within your application where users are sent after a
# successful login is processed at the callback URL.
# Defaults to "/profile" if not specified.
ZITADEL_POST_LOGIN_URL="/profile"

# URL where users are redirected after logout. This should match a Post Logout
# Redirect URI configured in your ZITADEL application settings.
ZITADEL_POST_LOGOUT_URL="http://localhost:3000"
```

### Installation and Running

Follow these steps to get the application running:

```bash
# 1. Clone the repository
git clone git@github.com:zitadel/example-auth-nestjs.git

cd example-auth-nestjs

# 2. Install the project dependencies
npm install

# 3. Start the development server
npm run dev
```

The application will now be running at `http://localhost:3000`.

## Key Features

### PKCE Authentication Flow

The application implements the secure Authorization Code Flow with PKCE (Proof Key for Code Exchange), which is the recommended approach for modern web applications.

### Session Management

Built-in session management with Auth.js handles user authentication state across your application, with automatic token refresh and secure session storage.

### Route Protection

Protected routes automatically redirect unauthenticated users to the login flow using NestJS Guards, ensuring sensitive areas of your application remain secure. The `@Public()` decorator allows specific routes to bypass authentication.

### NestJS Integration

Leverages NestJS features including:
- **Guards**: Global authentication guard with `@Public()` decorator for public routes
- **Decorators**: `@AuthSession()` parameter decorator for accessing session data
- **Modules**: Clean separation of concerns with dedicated AuthModule
- **Dependency Injection**: Seamless integration with NestJS's DI system

### Logout Flow

Complete logout implementation that properly terminates both the local session and the ZITADEL session, with proper redirect handling.

## TODOs

### 1. Security headers (NestJS middleware)

**Not enabled.** Consider adding security headers using NestJS middleware or the helmet package:

```typescript
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"],
        },
      },
    }),
  );

  await app.listen(3000);
}
```

At minimum, configure:

- `Content-Security-Policy` (CSP)
- `X-Frame-Options` / `frame-ancestors`
- `Referrer-Policy`
- `Permissions-Policy`

## Resources

- **NestJS Documentation:** <https://nestjs.com/>
- **@mridang/nestjs-auth:** <https://github.com/mridang/nestjs-auth>
- **Auth.js Documentation:** <https://authjs.dev/>
- **ZITADEL Documentation:** <https://zitadel.com/docs>
