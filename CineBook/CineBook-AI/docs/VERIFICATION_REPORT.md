# CineBook AI — verification report

**Verification date:** 2026-11-17  
**Scope:** React/Vite frontend source, Vercel proxy routes, preserved frontend regression coverage, repository/configuration invariants, and packaging hygiene.

## Results that passed in this environment

| Check | Result | What it establishes |
|---|---:|---|
| `cd frontend && npm run check` | Passed | Node syntax checks for the Vercel API and OAuth proxy handlers. |
| `cd frontend && npm test` | Passed: 8/8 | Offline frontend source/config tests, including OAuth one-time callback replay protection, API proxy routing and raw webhook-body forwarding. |
| `cd frontend-legacy && npm test` | Passed: 9/9 | Regression checks for the preserved original UI and its prior API interactions. |
| `node --check` on legacy app/server and active proxy functions | Passed | The checked JavaScript files parse. |
| TypeScript parser syntax pass | Passed: 18 files, 0 syntax diagnostics | TS/TSX source has no parser-level syntax errors; this does not perform module resolution or full type-checking. |
| `python scripts/verify-repository.py` | Passed: 326 assertions, 0 failures | Required files and selected source/configuration/security invariants are present. It is a static repository check, not an application integration test. |
| PyYAML parse of local/production Compose and Spring YAML | Passed: 4 files | The checked YAML documents are syntactically parseable. This is not `docker compose config`. |

## Checks that could not be completed

- **React production build / full TypeScript typecheck:** not completed. `npm run build` stopped because the required React, Vite, TanStack Query, Lucide and type packages were not installed in this environment. An `npm install` attempt did not complete because the npm registry was not reachable in the allotted execution. The syntax-only transpile above does not certify TypeScript types or bundling.
- **Backend Maven compilation and tests:** not run because Maven is not installed. JDK 21 is available, but that alone is insufficient to resolve Spring, JPA, Security, Spring AI and other dependencies. Run `cd backend && mvn clean verify` with Maven 3.9+ and JDK 21.
- **Docker image builds / Compose interpolation:** not run because Docker and the Compose CLI are not installed. Run `docker compose config` and then `docker compose up --build` on a machine with Docker Desktop or Docker Engine.
- **Database migrations and real MySQL concurrency:** not run. The migration files are present and YAML parses, but a real MySQL 8 migration and concurrent seat-hold test are still required.
- **Live Google OAuth round-trip:** not run. Real Google Cloud OAuth client credentials, authorized domains, exact callback URI and a browser session on the target domain are required.
- **Live Spring AI / SMTP / Razorpay / managed Redis / RabbitMQ:** not run. These need valid external credentials and reachable services. The development payment simulator is not a real money transfer.
- **Full browser end-to-end and load testing:** not run. The JMeter plan is included, but no performance numbers are claimed.

## Known scope gaps in this release

This ZIP is a significant upgrade of the supplied application, not a complete implementation of every item in the original product brief. The following remain incomplete and should not be represented as delivered features:

- The partner workspace is read-only (partner-owned showtimes); theatre registration, screen/seat-layout editing, showtime scheduling and partner revenue management UIs are not complete.
- The admin workspace currently focuses on user-role management and audit events. It is not a full operations console for all customer, partner, theatre, payment, refund, coupon, movie and review workflows.
- The AI feature is a live-catalogue discovery assistant. Predictive demand/revenue forecasting, AI review sentiment intelligence, AI-generated partner insights and LLM-based seat assignment are not implemented. Deterministic backend seat-recommendation functionality is separate.
- Dedicated QR-code ticket presentation/verification, full waitlist promotion UI, and end-to-end notification-centre workflows have not been verified as a complete React customer journey.
- Production-scale targets (one million accounts, 10,000 concurrent virtual users, sub-300 ms read p95 and sub-800 ms booking p95) have not been load-tested or demonstrated. In-memory authentication throttling also needs shared/distributed enforcement for multiple backend instances.

## Required verification before a public launch

1. Install Node.js 22 dependencies and run `npm run typecheck`, `npm test`, and `npm run build` from `frontend/`.
2. Run `mvn clean verify` from `backend/` using JDK 21 and Maven 3.9+; resolve any compile or test failures before deployment.
3. Validate both Compose files with Docker Compose and build both images.
4. Apply Flyway migrations to a disposable MySQL 8 database, run all integration tests, and execute two-user seat contention tests.
5. Complete the Google OIDC login/callback/logout/refresh flow on the real Vercel hostname using a non-production Google OAuth client.
6. Test AI-provider missing-key, timeout, malformed-response and rate-limit behavior.
7. Run Razorpay test-mode order, signature, duplicate webhook, cancellation and refund scenarios; verify exact webhook raw-body signature handling through the deployed Vercel proxy.
8. Run browser E2E, accessibility, dependency/security scans, backups/restore drills and JMeter load tests. Publish only measured performance results.

## Useful commands

```powershell
# React frontend
cd frontend
npm install
npm run typecheck
npm test
npm run build

# Java backend
cd ..\backend
mvn clean verify

# Local containers (repository root)
cd ..
docker compose config
docker compose up --build -d

# Offline structural checks
python scripts/verify-repository.py
```

**No claim of a bug-free build, zero runtime defects, live external integration, or production certification is made.** The passing checks above are exactly the checks executed in this environment; they do not replace the remaining verification steps.
