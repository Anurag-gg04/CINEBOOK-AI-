# Security notes

## Controls implemented

- MySQL 8 persistence with Flyway-managed schema migrations and Hibernate schema validation (`ddl-auto: validate`).
- Passwords stored with BCrypt cost 12; new passwords must be at least 12 characters and at most 72 characters.
- New registrations always receive the `CUSTOMER` role; role-specific endpoints are enforced by Spring Security, not just hidden in the UI.
- Short-lived signed JWT access tokens, hashed and rotating refresh tokens, and refresh-token revocation on logout.
- Request throttling for login by IP and email, a broader per-IP login limit, and sign-up throttling (process-local limits).
- Configurable SMTP welcome email and successful sign-in alerts, with bounded SMTP timeouts and secrets supplied through environment variables.
- Production-profile email ownership verification with a cryptographically random single-use token, 30-minute expiry, SHA-256 token-hash storage, and rate-limited verification attempts.
- Security response headers, a restrictive Content Security Policy for the static frontend, no inline JavaScript event handlers, configurable CORS origins, and hidden Actuator health details.
- OpenAPI/Swagger is not public by default; the `prod` profile disables it. The `prod` profile also disables development seed accounts and rejects known bundled JWT placeholder secrets.
- Existing protections remain: role/ownership checks, input validation, correlation IDs, Razorpay signature validation, webhook deduplication, and audited admin role changes.

## Enable account emails

Set these environment variables on the backend: `APP_MAIL_ENABLED=true`, `APP_MAIL_LOGIN_ALERTS=true`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, and `MAIL_FROM`. Set `MAIL_FROM` to a sender mailbox accepted by your SMTP provider. For Gmail SMTP, use `smtp.gmail.com` on port `587`, enable two-step verification, and use a Google App Password rather than your normal account password. Never commit the password or any `.env` file.

In the local profile, when SMTP is disabled or delivery fails, sign-up still works; the registration response includes `emailSent: false` and the frontend displays a setup message. The `prod` profile requires SMTP-backed email verification before an account may sign in; it intentionally fails sign-up if a verification message cannot be sent. Local verification can be tested by setting `APP_EMAIL_VERIFICATION_REQUIRED=true` with valid SMTP settings. Successful logins can trigger security alert emails when `APP_MAIL_LOGIN_ALERTS=true`. Set `APP_PUBLIC_URL` to the exact public HTTPS frontend origin before using a deployed site.

## Production startup

Set `SPRING_PROFILES_ACTIVE=prod`, provide a unique randomly generated `JWT_SECRET` with at least 32 bytes of entropy, set strong MySQL credentials, and configure SMTP for mandatory email verification. The production profile blocks the development payment simulator even if an environment override tries to enable it; configure and test a real gateway before allowing bookings. The production profile disables seeding even if the development seed variable is accidentally left on. Use a clean production database or remove any demo accounts already seeded into an existing database. Configure TLS/HSTS at the HTTPS reverse proxy and allow only the real frontend origin in `CORS_ALLOWED_ORIGINS`. Keep payment credentials in server-side environment secrets and use Razorpay production credentials only after independent testing and reconciliation checks.

For local direct startup, environment variables must be exported into the backend process; the root `.env` file is automatically read by Docker Compose, but Spring Boot does not automatically load that root file when launched directly from a Java IDE.

## Remaining production limitations

- Login and sign-up throttling is in-memory per backend process. It resets on restart and is not distributed; use Redis-backed throttling or an edge/WAF rate limit for multi-instance deployments.
- Email verification is included, but password reset/account recovery is not implemented. Add a single-use, expiring recovery flow with abuse limits before public launch.
- Refresh tokens are held in browser `sessionStorage`. They are cleared with the tab session but remain readable to same-origin JavaScript; prefer Secure, HttpOnly, SameSite cookies with an explicit CSRF strategy for a production deployment.
- For a multi-instance production deployment, move rate limits to shared storage, monitor authentication abuse, add request-size limits and dependency/secret scanning, and run threat modelling plus security tests against a real MySQL environment.
- Partner schedule read endpoints are scoped to partner ownership, but full partner mutation endpoints are not implemented. Admin role changes are audited; high-risk production actions should use stronger approval and external immutable logs.
- This is portfolio software, not a security certification. Review data retention, privacy/legal requirements, backups/restore drills, payment reconciliation, and incident response before serving real customers.
