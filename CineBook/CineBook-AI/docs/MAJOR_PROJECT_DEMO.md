# Major-project demonstration guide

## Before the demonstration

1. Follow the Windows 11 local startup steps in the root `README.md`.
2. Confirm `/actuator/health/readiness` is healthy and the React site opens on `http://localhost:5173`.
3. Set your own `DEMO_ACCOUNT_PASSWORD` in the uncommitted local `.env` file; the seed code does not contain a default demo password. Never use demo credentials on a public deployment.
4. Make sure the seed ran against a disposable local database. Do not connect a demonstration build to production customer records.
5. Leave `PAYMENT_MODE=SIMULATOR` for a classroom demo and explain that simulated payment does not transfer money. Do not use live payment credentials for a demonstration.
6. For Google sign-in, configure a separate test OAuth client and add the localhost callback described in `GOOGLE_OAUTH.md`. Otherwise, demonstrate the explicit disabled state rather than claiming it was authenticated.
7. For the AI assistant, add a backend-only test API key. Without it, show the honest unavailable message and continue to demonstrate catalogue and booking functionality.

## Suggested presentation sequence

1. Explain the problem statement and high-level architecture.
2. Show the catalogue search and movie-detail data loaded from the backend.
3. Open a showtime, inspect current seat statuses and create a temporary hold.
4. Complete a clearly labelled simulator payment and show the resulting booking record.
5. Open booking history and demonstrate cancellation only where the backend considers it eligible.
6. Show email/password and, only when configured, Google sign-in and email verification.
7. Open the AI assistant and demonstrate that recommendations are tied to the live showtime catalogue.
8. Demonstrate role-based dashboard behavior and the protected admin audit/role-management workspace.
9. Explain the Vercel frontend / hosted Spring Boot backend split and the external services that must be provisioned.
10. Finish with the actual verification report and clearly state which integrations were not live-tested.

## Questions to prepare for

Be ready to explain seat locking, idempotency, refresh-token rotation, Google `sub`, one-time login codes, Flyway migration ordering, payment signature verification, webhook deduplication, the outbox pattern and why a Vercel static frontend cannot host a persistent Spring Boot/MySQL/RabbitMQ stack. The `INTERVIEW_PREPARATION.md` file contains additional discussion points.
