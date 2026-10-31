# CineBook AI

A cinema-themed, modular-monolith movie ticket booking application using Java 21, Spring Boot 3, MySQL 8, optional Redis/RabbitMQ, and a vanilla HTML/CSS/JavaScript frontend. The interface includes separate customer, theatre-partner, administrator, and operations dashboards with a shared cinematic theme and role-specific layouts. The core booking journey uses the REST API and relational seat inventory; the development payment simulator does not move money.

> **Development / portfolio software, not production-certified.** Frontend checks and static repository verification are included; backend Maven tests, Docker image builds, and live payment flows still need to be run in an environment with Maven and Docker. See [`docs/VERIFICATION_REPORT.md`](docs/VERIFICATION_REPORT.md) for the current verification results and remaining gaps.

## Features implemented in this repository

- Public movie catalog search, language/genre filters, detail pages, theatres, showtimes and per-show seat inventory.
- Registration/login, BCrypt password hashing, a 12-character signup minimum with interactive strength feedback, short-lived JWT access tokens, rotating/revocable refresh tokens, IP/email sign-in throttling, role enforcement, optional SMTP welcome/sign-in alerts, and production email verification with single-use expiring tokens.
- Database-authoritative per-show seats, pessimistic row locking, temporary seat holds, scheduled expiration, quote/coupon calculation, idempotency keys, booking history/ticket, cancellation and development-only simulated refund.
- Deterministic seat recommendation from actual inventory, with adjacent-seat, budget, row preference, aisle and accessible-seat preferences plus explanation strings.
- Razorpay test-mode order creation, server-side checkout signature verification, webhook signature/event deduplication, refund request records and ambiguous-outcome messaging. Requires credentials and was not live-tested here.
- Transactional outbox records and optional RabbitMQ publisher; optional Redis cache. These are opt-in; core application defaults to simulator/local development.
- Customer, theatre-partner, administrator and operations dashboards; admin role/catalog-active controls and audit listing. The partner dashboard exposes owned show summary/export, not full theatre/screen/show CRUD.
- Actuator, OpenAPI/Swagger, Flyway schema, Postman collection, JMeter plan, backend/frontend checks and CI workflow.

## Production deployment

Use the separate [production deployment guide](docs/DEPLOYMENT.md) and `docker-compose.production.yml` for a Linux VPS deployment. Do not expose the development Compose ports to the public internet. Production runs with the `prod` Spring profile, disables demo seeding and the payment simulator, and keeps MySQL, Redis, RabbitMQ and the backend on the private Compose network. Configure HTTPS, SMTP, strong secrets, and Razorpay test credentials before validating checkout.

## Quick start (Windows PowerShell)

Run the launcher from the extracted repository folder:

```powershell
.\scripts\run-local.ps1
```

It uses Docker Compose when Docker Desktop is installed and running. If Docker is not running, it attempts direct mode and checks for Java 21+, Maven 3.9+, Node.js 22+, npm 10+, and MySQL on `localhost:3306`. To choose explicitly, use `.\scripts\run-local.ps1 -Docker` or `.\scripts\run-local.ps1 -Direct`. Java 26 is not rejected solely for being newer than Java 21, although Java 21 remains the project's tested target.

### Option A — Docker Compose (recommended on a machine with Docker Desktop)

1. Install Docker Desktop and ensure Docker Compose is available.
2. In the repository root:

   ```powershell
   Copy-Item .env.example .env
   # Keep PAYMENT_MODE=SIMULATOR initially. Change JWT_SECRET before exposing the app.
   docker compose up --build
   ```

3. Open the app at `http://localhost:5173` and Actuator health at `http://localhost:8080/actuator/health`. OpenAPI/Swagger is protected by default; only enable public docs explicitly with `API_DOCS_PUBLIC=true` for isolated local development.
4. Development accounts (local only): `customer@cinebook.local`, `partner@cinebook.local`, `admin@cinebook.local`, `ops@cinebook.local`. All use `CineBookDemo!2026`. Change/delete these accounts before any shared or public deployment.
5. `docker compose down`; to delete development databases too, `docker compose down -v` (destructive).

### Account email notifications (optional SMTP)

New sign-ups can receive a styled CineBook welcome email, and each successful login can trigger an account sign-in alert. SMTP is deliberately **off by default** for the local profile, so you can work on the application before configuring a provider. In the `prod` profile, email ownership verification is required before sign-in: the account receives a single-use verification link that expires after 30 minutes.

For Gmail, turn on 2-Step Verification and create a Google App Password if App Passwords are available for your account. Do not use your ordinary Google password. Google notes that App Passwords require 2-Step Verification and recommends “Sign in with Google” where supported: [Google Account Help](https://support.google.com/accounts/answer/185833?hl=en).

1. Copy `.env.example` to `.env` if you have not done so.
2. Set `APP_MAIL_ENABLED=true`, `APP_MAIL_LOGIN_ALERTS=true`, `MAIL_USERNAME=your-mailbox@gmail.com`, `MAIL_PASSWORD=your-16-character-app-password`, and `MAIL_FROM` to the same verified sender mailbox. Keep `MAIL_HOST=smtp.gmail.com` and `MAIL_PORT=587` for Gmail SMTP.
3. For a deployed site, set `APP_PUBLIC_URL` to the public HTTPS frontend origin and `CORS_ALLOWED_ORIGINS` to that origin. For production, set `SPRING_PROFILES_ACTIVE=prod`, replace the example `JWT_SECRET` with a unique randomly generated secret, and keep `APP_MAIL_ENABLED=true` so required verification email can be delivered.
4. Recreate the backend so Compose applies the new environment: `docker compose up --build -d backend`.
5. In the local profile, register a **new account** to test the welcome email. Sign out and sign in again to test the security alert. To test verification locally, set `APP_EMAIL_VERIFICATION_REQUIRED=true` as well as valid SMTP settings. Production requires verification automatically. Existing users do not receive a retroactive welcome email.

For direct PowerShell startup, `.env` is not automatically loaded into the backend process. Set the same variables in that terminal before running `scripts\Start-Backend.ps1`. In the local profile, email delivery is optional and the UI reports when it is not configured. When verification is required, sign-up fails closed if CineBook cannot send the verification email. SMTP diagnostics do not log message bodies, passwords, or full provider exception text.

Compose starts MySQL, Redis, RabbitMQ, backend and frontend. Optional Redis/RabbitMQ are enabled in Compose. Razorpay mode is selected only when valid keys are present; if enabled, the simulator is disabled so test-gateway payments are not confused with simulator results. The app can run without those integrations by setting `APP_REDIS_ENABLED=false`, `APP_CACHE_TYPE=none`, and `APP_MESSAGING_ENABLED=false`.

### Option B — run the backend and frontend directly

Requirements: JDK 21, Maven 3.9+, Node.js 22+, npm 10+, and a local MySQL 8 database. Redis/RabbitMQ are optional. Ensure schema database `cinebook` exists, copy `.env.example` to `.env`, and export the needed variables (the application does not auto-load the root `.env` when run directly).

```powershell
# Terminal 1 - backend (from repository root)
# Recommended: .\scripts\Start-Backend.ps1 (sets local defaults and starts Maven)
$env:DB_URL = "jdbc:mysql://localhost:3306/cinebook?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC"
$env:DB_USERNAME = "cinebook"
$env:DB_PASSWORD = "cinebook_dev_only"
$env:JWT_SECRET = "replace-with-a-unique-random-secret-longer-than-32-bytes"
$env:PAYMENT_MODE = "SIMULATOR"
cd backend
mvn spring-boot:run

# Terminal 2 - frontend (from repository root)
cd frontend
npm run dev
```

The dependency-light Node static server serves the HTML/CSS/JavaScript frontend and proxies `/api` to `http://localhost:8080`. When the backend starts, Flyway creates the schema and the development seed creates movies, theatres, showtimes, accounts and coupons. If using an already populated DB, the seed runner exits when movie records already exist.

If startup reports `Detected failed migration to version 1 (initial schema)`, see [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md). For a **disposable local database only**, `scripts/reset-local-cinebook-db.sql` recreates the database so Flyway can retry V1; this permanently deletes all data in `cinebook`. Do not run it on a database whose contents you need.

### Verification commands

```powershell
# backend
cd backend
mvn test
mvn package

# frontend (in another terminal)
cd frontend
npm run check
npm test
npm run build
```

The frontend has no runtime npm dependencies. Docker Compose checks: `docker compose config`, `docker compose up --build`, then verify `/actuator/health/readiness`.

## Payment modes

- **SIMULATOR** is for local development only. The `prod` profile blocks simulator payments in the backend even if an environment variable attempts to enable them. “Success” is an explicit local simulator decision; the API checks hold ownership, expiration, seat state and idempotency before confirming. A simulator refund is not a bank refund.
- **RAZORPAY** requires `PAYMENT_MODE=RAZORPAY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and webhook secret. Use only Razorpay test credentials for development. The app loads Checkout.js only if `/api/payments/options` says enabled. Configure the webhook URL as `https://YOUR-REACHABLE-HOST/api/payments/razorpay/webhook` with a secret and enable appropriate `payment.captured`, `payment.failed`, `refund.processed`, and `refund.failed` events. Localhost is not reachable by the gateway without a secure tunnel. Do not put secrets in the frontend.

## Architecture and contracts

- API reference: [`docs/API_REFERENCE.md`](docs/API_REFERENCE.md) or Swagger UI.
- Booking consistency: [`docs/BOOKING_CONSISTENCY.md`](docs/BOOKING_CONSISTENCY.md).
- Payment and security: [`docs/PAYMENT_WORKFLOW.md`](docs/PAYMENT_WORKFLOW.md), [`docs/SECURITY.md`](docs/SECURITY.md).
- Full docs and known limitations are in `docs/`.
- Postman: `postman/CineBook-AI.postman_collection.json`.
- Load test skeleton: `performance/cinebook-booking.jmx` (configure credentials and IDs; start low).

## Important production-hardening gaps

Before real public use, add migrations/backups/restore drills, proper distributed rate limiting, CSRF strategy if refresh-token storage changes to cookies, complete partner mutation workflows with ownership scoping, email deliverability monitoring/retry handling, durable monitoring/alerting, a payment reconciliation job, fraud/abuse controls, deployment TLS/HSTS, security and concurrency testing against real MySQL, and review data-retention/privacy/legal requirements. The refresh token is currently held in browser session storage: safer than persistent local storage for reducing persistence, but still accessible to active same-origin JavaScript; consider an HttpOnly Secure SameSite cookie architecture with CSRF defenses.


### If the browser still displays `customerRail is not defined`

The corrected vanilla-JavaScript customer dashboard does not reference `customerRail`; that message usually means the browser is using an older frontend bundle or the server is running from a different extracted folder. Stop the old frontend terminal with `Ctrl+C`, open the current project folder in VS Code, run `cd frontend` followed by `npm run dev`, and reopen the local URL printed by the new terminal. The app uses a versioned JavaScript URL and no-cache headers to reduce stale-asset issues.
