# Google OAuth 2.0 / OpenID Connect

## Flow

1. The browser opens `/oauth2/authorization/google` on the same public origin as the frontend.
2. The Vercel function or local reverse proxy forwards the request to Spring Security and preserves the original Host/protocol headers.
3. Spring Security generates and verifies OAuth `state`, exchanges the authorization code server-side, and validates the OIDC ID token through the configured Google provider metadata/JWK set. The user service additionally requires Google `email_verified=true`, the expected issuer and the configured client audience.
4. `sub` is the stable provider identity. CineBook looks up `(provider, sub)`; for an existing account it links only when CineBook's local email is already verified. A new account receives `CUSTOMER` role.
5. The backend issues a random 32-byte one-time code with a 90-second expiry. Only its SHA-256 hash is stored.
6. The browser is redirected to `/auth/callback?code=...`. React posts the code to `/api/auth/oauth/exchange`; a database row lock prevents replay. The code is consumed once.
7. The backend returns a short-lived JWT access token and sets the rotated refresh token as an `HttpOnly` cookie. The refresh token is not included in JSON.

The OAuth callback stores Spring's temporary login state in the HTTP session. Keep the proxy same-origin and preserve `Set-Cookie`/`Cookie` headers on both `/oauth2/**` and `/login/oauth2/**` requests.

## Google Cloud Console setup

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen and app name, support email and developer contact email.
3. Add the public frontend domain under Authorized domains after completing Google domain verification where requested.
4. Create an OAuth Client ID of type **Web application**.
5. Add local JavaScript origin: `http://localhost:5173`.
6. Add local redirect URI: `http://localhost:5173/login/oauth2/code/google`.
7. For production, add the Vercel custom domain / `*.vercel.app` hostname as an authorized domain where permitted, add the exact HTTPS JavaScript origin, and add the exact HTTPS redirect URI, e.g. `https://your-app.vercel.app/login/oauth2/code/google`.
8. Copy the client ID and secret to the backend environment only.

For an OAuth consent screen in Testing mode, add each test account as a test user. Do not publish or request sensitive Google scopes; CineBook needs only `openid`, `profile` and `email`.

## Backend environment

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
FRONTEND_URL=https://your-app.vercel.app
GOOGLE_REDIRECT_URI=https://your-app.vercel.app/login/oauth2/code/google
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=lax
REFRESH_COOKIE_SECURE=true
REFRESH_COOKIE_SAME_SITE=Lax
```

For local Docker, use the `http://localhost:5173` origin and callback with both secure cookie flags set to `false`. If `GOOGLE_REDIRECT_URI` is empty, Spring's standard `{baseUrl}/login/oauth2/code/{registrationId}` template uses the forwarded public request origin; the value registered in Google must match the actual callback URL exactly.

## Security and troubleshooting

- Never put `GOOGLE_CLIENT_SECRET` or any OAuth secret in `frontend/.env`, `VITE_*`, a browser bundle, a URL or a committed file.
- If `/api/auth/google/status` says disabled, check that both backend client variables exist and restart the backend.
- `redirect_uri_mismatch` means the exact callback URL sent by CineBook differs from the URL registered in Google. Check scheme, host, port, path and trailing slash.
- If the Google callback loses login state, check that the Vercel proxy forwards `Cookie` and `Set-Cookie`, that the session cookie uses `Path=/`, and that the browser is using the same public hostname during authorization and callback.
- Production must use HTTPS and Secure cookies. Do not set `SameSite=None` unless a deliberately cross-site architecture also uses `Secure` cookies and a documented CSRF defense.
- Google sign-in does not grant `ADMIN`, `THEATRE_PARTNER` or `OPERATIONS` privileges. First-admin creation remains a controlled database operation documented in `DEPLOYMENT.md`.

A live Google login is not considered tested until the real Google client has been configured and a browser round-trip succeeds on the target domain.
