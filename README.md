# Express.js with ZITADEL

[Express.js](https://expressjs.com/) is a popular and powerful framework for building the backend of web applications. In a traditional setup, often called a "Backend for Frontend" (BFF), your Express server manages both your application's logic and renders the web pages that users see.

To secure such an application, you need a reliable way to handle user logins. For the Express ecosystem, [Passport.js](http://www.passportjs.org/) is the standard and recommended middleware for authentication. Think of it as a flexible security guard for your app. This guide demonstrates how to use Passport.js with an Express v5 application to implement a secure login with ZITADEL.

We'll be using the **OpenID Connect (OIDC)** protocol with the **Authorization Code Flow + PKCE**. This is the industry-best practice for security, ensuring that the login process is safe from start to finish. You can learn more in our [guide to OAuth 2.0 recommended flows](https://zitadel.com/docs/guides/integrate/login/oidc/oauth-recommended-flows).

This example uses **Passport.js**, the standard for Express.js authentication. While ZITADEL doesn't offer a specific SDK, Passport.js is highly modular. It works with a "strategy" that handles the communication with ZITADEL. Under the hood, this example uses the powerful [`openid-client`](https://github.com/panva/node-openid-client) library to manage the secure OIDC PKCE flow.

Check out our Example Application to see it in action.

## Example Application

The example repository includes a complete Express.js application, ready to run, that demonstrates how to integrate ZITADEL for user authentication.

This example application showcases a typical web app authentication pattern: users start on a public landing page, click a login button to authenticate with ZITADEL, and are then redirected to a protected profile page displaying their user information. The app also includes secure logout functionality that clears the session and redirects users back to ZITADEL's logout endpoint. All protected routes are automatically secured using Passport.js middleware, ensuring only authenticated users can access sensitive areas of your application.

### Prerequisites

Before you begin, ensure you have the following:

#### System Requirements

- Node.js (v20 or later is recommended)

#### Account Setup

You'll need a ZITADEL account and application configured. Follow the [ZITADEL documentation on creating applications](https://zitadel.com/docs/guides/integrate/login/oidc/web-app) to set up your account and create a Web application with Authorization Code + PKCE flow.

> **Important:** Configure the following URLs in your ZITADEL application settings:
>
> - **Redirect URIs:** Add `http://localhost:3000/auth/callback` (for development)
> - **Post Logout Redirect URIs:** Add `http://localhost:3000` (for development)
>
> These URLs must exactly match what your Express application uses. For production, add your production URLs.

### Configuration

To run the application, you first need to copy the `.env.example` file to a new file named `.env` and fill in your ZITADEL application credentials.

```dotenv
# Port number where your Express server will listen for incoming HTTP requests.
# Change this if port 3000 is already in use on your system.
PORT=3000

# Session timeout in seconds. Users will be automatically logged out after this
# duration of inactivity. 3600 seconds = 1 hour.
SESSION_DURATION=3600

# Secret key used to cryptographically sign session cookies to prevent
# tampering. MUST be a long, random string. Generate a secure key using:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET="your-very-secret-and-strong-session-key"

# Your ZITADEL instance domain URL. Found in your ZITADEL console under
# instance settings. Include the full https:// URL.
# Example: https://my-company-abc123.zitadel.cloud
ZITADEL_DOMAIN="https://your-zitadel-domain"

# Application Client ID from your ZITADEL application settings. This unique
# identifier tells ZITADEL which application is making the authentication
# request.
ZITADEL_CLIENT_ID="your-client-id"

# Client Secret for confidential applications. Leave empty for public clients.
# Only required if you selected "Confidential" when creating your ZITADEL app.
ZITADEL_CLIENT_SECRET=""

# OAuth callback URL where ZITADEL redirects after user authentication. This
# MUST exactly match a Redirect URI configured in your ZITADEL application.
ZITADEL_CALLBACK_URL="http://localhost:3000/auth/callback"

# URL where users are redirected after logout. This should match a Post Logout
# Redirect URI configured in your ZITADEL application settings.
ZITADEL_POST_LOGOUT_URL="http://localhost:3000"

# Internal redirect destination after successful login. This is where your app
# sends users after ZITADEL confirms authentication. Defaults to "/profile".
ZITADEL_POST_LOGIN_URL="/profile"
```

### Installation and Running

Follow these steps to get the application running:

```bash
# 1. Clone the repository
git clone git@github.com:zitadel/example-auth-expressjs.git

cd example-auth-expressjs

# 2. Install the project dependencies
npm install

# 3. Start the development server
npm run dev
```

The application will now be running at `http://localhost:3000`.

## Resources

- **Example App Repository:** [Link to your future GitHub repository]
- **Express.js Documentation:** <https://expressjs.com/>
- **Passport.js Documentation:** <http://www.passportjs.org/>
- **Express Session Middleware:** <https://expressjs.com/en/resources/middleware/session.html>
