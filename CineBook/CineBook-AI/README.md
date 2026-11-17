# CineBook AI — Cinema Booking & Management Platform

CineBook AI is a modular-monolith cinema booking application built around a Java 21 / Spring Boot 3.4 backend, MySQL 8, Flyway migrations, a React + TypeScript + Vite frontend, and an optional Spring AI assistant. It supports customer ticket booking, transactional seat holds, partner and operations views, platform administration, Google OpenID Connect sign-in, and Razorpay test-mode checkout.

> **Important:** This is an upgraded major-project codebase, not a production certification. External credentials and hosted services are required for live Google sign-in, LLM responses, SMTP, Razorpay and deployment. Java compilation, Maven tests, Docker builds and live OAuth were not executable in the environment used to prepare this ZIP. The exact verification scope is recorded in [`docs/VERIFICATION_REPORT.md`](docs/VERIFICATION_REPORT.md). No claim of “zero bugs” or tested production readiness is made.

## What's included

- **Customer experience:** live movie catalogue, search and genre filters, movie details, showtimes, seat inventory, short-lived seat holds, checkout, booking history and cancellation.
- **Booking safety:** database-backed seat inventory, row-level locking, unique show/seat constraints, idempotency keys, expiring holds and server-side payment verification in the existing backend.
- **Authentication:** email/password with BCrypt and JWT access tokens; the active React app also handles the single-use production email-verification link; rotating server-side refresh tokens delivered in an `HttpOnly` cookie; one-time Google sign-in exchange codes; Google OIDC identity records; email verification support.
- **AI assistant:** Spring AI / OpenAI-compatible chat integration. The model receives a bounded snapshot of actual upcoming CineBook showtimes; it is not allowed by the system prompt to invent titles, theatres, prices or bookings. Missing API credentials produce a clear unavailable response while booking remains usable.
- **Partner workspace:** reads showtimes belonging to the authenticated partner account. The backend enforces partner/admin roles.
- **Admin workspace:** reads registered users and recent audit events, and can change user roles through protected backend endpoints. The backend prevents an administrator from demoting their own account.
- **Operations workspace:** database-backed operational metrics from the existing dashboard endpoint.
- **Payments:** local simulator is explicitly a test-only flow and cannot move money. Razorpay is a separate integration; use test credentials until webhooks, refunds and reconciliation have been validated.
- **Infrastructure:** local Docker Compose for MySQL, Redis, RabbitMQ, Spring Boot and Nginx; production-oriented Java Dockerfile and separate deployment examples.

## Repository layout

```text
CineBook-AI/
├── backend/                 # Java 21, Spring Boot, JPA, Security, Flyway, Spring AI
├── frontend/                # Active React + TypeScript + Vite app; Vercel project root
├── frontend-legacy/         # Preserved original HTML/CSS/vanilla-JS frontend (archive only)
├── docs/                    # Architecture, OAuth, AI, deployment and testing guides
├── performance/             # JMeter booking load-test plan
├── postman/                 # API collection
├── scripts/                 # PowerShell launchers and offline repository checks
├── docker-compose.yml       # Local development stack
├── docker-compose.production.yml
├── .env.example
└── .env.production.example
```

`frontend/` is the active app. `frontend-legacy/` is retained as a reference copy of the original UI; it is not built by Docker Compose or deployed to Vercel.

## Windows 11 — exact local startup (recommended: Docker Desktop)

### Prerequisites

Install Docker Desktop with the WSL 2 backend enabled. Docker Compose v2 must work in PowerShell. For source-only frontend development, install Node.js 22 or newer. For direct backend startup, also install JDK 21 and Maven 3.9+.

### Start the complete local stack

Open PowerShell in the extracted `CineBook-AI` directory and run:

```powershell
Copy-Item .env.example .env
```

Open `.env` and set `DEMO_ACCOUNT_PASSWORD` to a password you choose for local demo users. Also replace `JWT_SECRET` with a unique random value. The example MySQL and RabbitMQ passwords are for isolated local development only. Keep `PAYMENT_MODE=SIMULATOR` and leave Google/AI credentials blank until you configure them.

Then run:

```powershell
docker compose config
docker compose up --build -d
docker compose ps
docker compose logs -f backend
```

Open these local addresses:

- CineBook React app: `http://localhost:5173`
- Spring Boot API health: `http://localhost:8080/actuator/health`
- Readiness health: `http://localhost:8080/actuator/health/readiness`
- RabbitMQ management (local only): `http://localhost:15672`

Stop the stack with:

```powershell
docker compose down
```

To remove local database/cache/broker volumes as well (destructive; deletes local data):

```powershell
docker compose down -v
```

### Local development accounts

When `APP_SEED_ENABLED=true` in the local profile and the database is empty, the backend inserts demonstration records and local demo users. Set `DEMO_ACCOUNT_PASSWORD` in your uncommitted `.env` file before the first seed. The usernames and roles are defined in `DevelopmentSeed.java`, but no default demo password is committed. Never enable development seeding in a public deployment. Seeded records are illustrative, not real cinema inventory.

### Run React and Java directly (without containers)

1. Start MySQL 8 and create the configured database/user. Redis and RabbitMQ can be disabled by setting `APP_REDIS_ENABLED=false`, `APP_CACHE_TYPE=none` and `APP_MESSAGING_ENABLED=false` in the backend terminal.
2. Run the backend in PowerShell terminal 1:

```powershell
cd backend
$env:DB_URL = "jdbc:mysql://localhost:3306/cinebook?useUnicode=true&characterEncoding=utf8&serverTimezone=UTC"
$env:DB_USERNAME = "cinebook"
$env:DB_PASSWORD = "cinebook_dev_only"
$env:JWT_SECRET = "replace-with-a-random-secret-of-at-least-32-bytes"
$env:DEMO_ACCOUNT_PASSWORD = Read-Host "Enter a local-only demo password"
$env:SPRING_PROFILES_ACTIVE = "local"
mvn spring-boot:run
```

3. Run the frontend in PowerShell terminal 2:

```powershell
cd frontend
npm install
npm run dev
```

The Vite dev server proxies `/api`, `/oauth2` and `/login/oauth2` to `http://localhost:8080` by default. Set `BACKEND_BASE_URL` in `frontend/.env.local` only when the backend uses a different local address. Do not put backend secrets into any `VITE_*` variable.

## Google sign-in configuration

Read [`docs/GOOGLE_OAUTH.md`](docs/GOOGLE_OAUTH.md). Google sign-in is disabled until `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set on the **backend**. Register the callback URI served by the frontend proxy, not the Java host's private URL:

```text
http://localhost:5173/login/oauth2/code/google
```

For production, register the exact HTTPS URI on the Vercel domain, for example `https://your-app.vercel.app/login/oauth2/code/google`. Configure `FRONTEND_URL`, `GOOGLE_REDIRECT_URI`, `SESSION_COOKIE_SECURE=true` and `REFRESH_COOKIE_SECURE=true` on the backend host. The frontend uses a same-origin proxy so OAuth session and refresh cookies stay on the public frontend host.

## AI assistant configuration

Read [`docs/AI_FEATURES.md`](docs/AI_FEATURES.md). Add `AI_API_KEY` to the backend environment (never to Vercel's `VITE_*` variables). The default integration uses the Spring AI OpenAI starter and `AI_MODEL=gpt-4o-mini`. If the key is blank or the provider is unavailable, the AI assistant returns an explicit configuration/service error; catalogue, login and bookings are not intentionally disabled.

## Deployment: Vercel frontend + hosted Java backend

For the final-year write-up, scope and presentation sequence, see [`docs/PROJECT_REPORT.md`](docs/PROJECT_REPORT.md), [`docs/MAJOR_PROJECT_DEMO.md`](docs/MAJOR_PROJECT_DEMO.md) and [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md). Deploy using [`docs/VERCEL_DEPLOYMENT.md`](docs/VERCEL_DEPLOYMENT.md). Deploy `frontend/` as the Vercel project root. Deploy `backend/` as a Docker web service on a Java-compatible host such as Render, Railway, Fly.io or a cloud container service. Set Vercel's `BACKEND_BASE_URL` to the backend's HTTPS **origin** (no `/api` suffix). Host MySQL, Redis and RabbitMQ as managed/private services or provision them with the backend host. Vercel is the frontend and proxy host; it does not run the Spring Boot service, MySQL, Redis or RabbitMQ as ordinary Vite static assets.

The included `docker-compose.production.yml` is a separate single-VPS option. It is not the Vercel architecture. Review [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) before exposing any public service.

## Tests and verification commands

```powershell
# Frontend (React / Node)
cd frontend
npm install
npm run check
npm test
npm run typecheck
npm run build

# Backend (JDK 21 + Maven 3.9+)
cd ..\backend
mvn clean verify

# Structural/configuration checks (Python 3)
cd ..
python scripts/verify-repository.py
```

A successful static source check does not prove that OAuth, database concurrency, payments, mail delivery or cloud deployment work end-to-end. See `docs/VERIFICATION_REPORT.md` for the checks actually run for this release and those that still need to be executed with Maven, npm dependencies, Docker and external credentials.

## Security / operating notes

- Never commit `.env`, SMTP passwords, JWT secrets, database credentials, Google client secrets, LLM keys or Razorpay secrets.
- Google sign-in creates a `CUSTOMER` account only. An existing CineBook account is linked only if it has already verified the same email with CineBook. Google identities never grant admin or partner rights.
- A Google OAuth authorization-code callback is exchanged for a short-lived one-time app code; the backend stores only its hash and consumes it once.
- Refresh tokens are stored hashed server-side and sent to the browser only as an `HttpOnly`, SameSite cookie. Production must set the cookie Secure flags.
- Payment simulator status is not a bank transfer or live payment. Use Razorpay test credentials for gateway development.
- Back up MySQL, verify restore drills, paginate growing endpoints, and run concurrency and browser tests before using real users.

## License / project use

This repository is provided as a student major-project codebase. Check the licences and terms for any third-party images, fonts, logos, APIs and payment-provider assets used when you deploy or redistribute the application.
