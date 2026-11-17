# CineBook AI — major project report

## Abstract

CineBook AI is a web-based cinema discovery and ticket booking platform. It combines a Java 21 / Spring Boot modular-monolith backend with a React + TypeScript frontend, MySQL persistence, Flyway migrations, JWT authentication, optional Google OpenID Connect, a Spring AI movie-discovery assistant, transaction-safe seat holds, and a Razorpay payment adapter. The application is designed to demonstrate how customer booking workflows and cinema operations can be organized behind role-protected APIs.

## Problem statement

Moviegoers often have to move between disconnected cinema catalogues, theatre listings, seat maps, payment pages and ticket records. Theatre operators and platform administrators also need reliable ways to manage showtime data, monitor bookings and inspect operational events. A central booking system must keep seat inventory consistent when multiple customers attempt to reserve the same seat, distinguish actual payment outcomes from test simulations, and avoid presenting invented availability or prices as real.

## Objectives

1. Provide a responsive catalogue and movie-detail experience connected to a persistent backend.
2. Allow authenticated customers to select an actual showtime, inspect seat inventory, place a temporary hold and complete a supported payment workflow.
3. Prevent double allocation through database locking, uniqueness constraints and idempotent commands in the existing booking engine.
4. Support email/password authentication and optional Google OIDC while keeping external identities separate from application roles.
5. Provide an AI-assisted discovery feature grounded in the current CineBook showtime catalogue.
6. Separate customer, theatre-partner, operations and administrator access and enforce permissions on the backend.
7. Provide repeatable local setup plus documented Vercel frontend / separately hosted Java backend deployment paths.

## Scope implemented in this codebase

### Customer

- Browse/search/paginate active movie catalogue records and inspect movie details.
- Browse actual upcoming showtimes, theatres and seat inventory.
- Select seats and request a temporary server-side hold.
- Use the configured development payment simulator or a separately configured Razorpay flow.
- View booking history and request cancellation for eligible bookings.
- Register and sign in with email/password; consume email verification links; optionally sign in through Google OIDC after external configuration.
- Ask the AI discovery assistant for matching upcoming catalogue entries when an LLM provider is configured.

### Platform and operations

- Role-scoped dashboard metrics read from backend repositories.
- Admin user listing, protected role changes and recent audit-event view.
- Partner-owned showtime listing enforced by partner ownership in the repository query.
- Operations view of selected payment, seat-hold and outbox metrics.

### Platform integrations

- MySQL and Flyway schema management.
- Redis cache and RabbitMQ/outbox integration in the existing backend configuration.
- Spring Security JWT and OAuth2/OIDC client.
- Spring AI with a configurable OpenAI-compatible chat provider.
- Razorpay order/signature/webhook/refund integration paths, not live-provider-certified.
- Vercel Node proxy functions for `/api`, Google authorization/callback and single-origin browser cookies.

## Functional requirements

| ID | Requirement | Status in this release |
|---|---|---|
| FR-01 | Search and view movies | Implemented against catalogue APIs |
| FR-02 | Browse showtimes and seat availability | Implemented against catalogue APIs |
| FR-03 | Create temporary seat holds | Existing backend implementation preserved; UI integrated |
| FR-04 | Confirm/cancel bookings | Existing backend/payment paths preserved; UI integrated |
| FR-05 | Email/password login and registration | Implemented in backend and React UI |
| FR-06 | Google sign-in | OIDC flow implemented; live credentials and round-trip still required |
| FR-07 | Email verification | Backend and React verification route implemented; SMTP delivery still required |
| FR-08 | AI discovery assistant | Implemented as catalogue-grounded LLM discovery; not a general recommendation engine |
| FR-09 | Admin user roles and audit view | Implemented for the listed API operations |
| FR-10 | Partner showtime view | Read-only view implemented |
| FR-11 | Full theatre/partner operations console | Not complete |
| FR-12 | AI forecasting, review intelligence, QR ticket verification | Not complete |

## Non-functional requirements and design decisions

- **Consistency:** booking decisions remain server-authoritative. The UI's seat display is informational; only the backend hold transaction reserves seats.
- **Security:** passwords use BCrypt; access tokens are short-lived; refresh tokens rotate and are delivered in an HttpOnly cookie; privileged endpoints enforce roles in Spring Security and controller/service ownership checks.
- **Availability:** AI and external payment providers are optional integrations; missing credentials should not make the catalogue or booking application pretend the provider is available.
- **Maintainability:** backend packages separate authentication, booking, catalogue, payment, notifications, dashboard, messaging and AI responsibilities.
- **Portability:** local Docker Compose and a separate Vercel/hosted-Java architecture are documented.
- **Scalability:** pagination, indexing, pooled database connections, caching, asynchronous outbox handling and a JMeter plan provide foundations. Actual target throughput and latency have not been measured.

## High-level architecture

The React SPA calls same-origin `/api` endpoints. In Vercel, serverless Node proxy functions forward requests to the hosted Spring Boot origin and preserve auth cookies, forwarded host/protocol and raw request bytes. Spring Boot uses Spring Security, service/repository layers, MySQL/Flyway and optional Redis/RabbitMQ/LLM/Razorpay providers. See `diagrams/system-architecture.mmd` and `VERCEL_DEPLOYMENT.md`.

## Core data model

The existing schema centers on users, movies, theatres, screens, seats, showtimes, show-seat inventory, seat holds, bookings, payments, refunds, coupons, notifications, outbox events, audit events and payment webhook events. The added OAuth migration stores provider identities and hashed, expiring, one-use login codes. See `DATABASE_DESIGN.md` and the Flyway scripts.

## Main booking flow

1. Customer selects a movie and real showtime from the catalogue API.
2. Client fetches current seat inventory and displays current statuses.
3. Customer selects up to the allowed seat count and posts a hold command with an idempotency key.
4. Backend validates ownership and inventory, takes database locks and persists the temporary hold.
5. Customer checks out using the configured development simulator or server-created Razorpay order.
6. Backend confirms the booking only after payment validation and a fresh inventory/hold check.
7. Booking history reads confirmed and cancelled/other booking states from the authenticated account.

See `diagrams/booking-sequence.mmd` and `BOOKING_CONSISTENCY.md`.

## Google OIDC flow

Google authentication uses a server-side authorization-code flow. Spring Security validates OIDC data; CineBook maps the provider `sub` to an OAuth identity, creates only CUSTOMER users, issues a short-lived one-use application code, and sets the application refresh cookie during code exchange. Existing CineBook email accounts are linked only after local email verification. See `GOOGLE_OAUTH.md` and `diagrams/google-oauth-sequence.mmd`.

## Security and limitations

The application is a student major-project codebase, not a security certification. Review `SECURITY.md` before any public launch. Current limitations include process-local authentication rate limits, no password-reset flow, incomplete partner mutation screens, limited admin operations, and unverified external provider integrations. Never use test simulator status as evidence of real money movement.

## Validation

The actual automated/static checks run for this delivery are recorded in `VERIFICATION_REPORT.md`. That report deliberately distinguishes source tests and YAML parsing from the unavailable Java build, React bundle build, Docker build, database integration, real OAuth, live payment and load tests.

## Future enhancements

- Complete partner onboarding, theatre/screen/seat-layout management and showtime scheduling.
- Complete admin workflows for movies, partners, theatres, coupons, payments, refunds, reviews and security monitoring.
- Add QR-code ticket generation and a separate authenticated ticket-validation endpoint.
- Implement customer reviews, moderation and review intelligence.
- Add historical recommendation profiles, demand forecasting, occupancy and revenue chart APIs.
- Move rate limits and idempotency coordination to shared infrastructure where appropriate; add multi-instance session and event-processing tests.
- Add password recovery, stronger approval for sensitive role changes, security scanning and immutable audit export.
- Run browser E2E, accessibility, MySQL race, gateway sandbox and load tests before production use.
