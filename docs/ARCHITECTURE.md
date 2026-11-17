# Architecture

## Shape

CineBook AI is a domain-oriented Spring Boot modular monolith. Packages are grouped by domain: `auth`, `catalog`, `booking`, `payment`, `events`, `dashboard`, `ai`, `common` and `config`. The active frontend is a separately deployable React + TypeScript + Vite SPA. REST DTOs are the browser/API boundary; JPA entities remain inside the backend.

```text
Browser (React / TypeScript)
  -> Vercel API proxy or local Nginx/Vite proxy
  -> Spring Security (OIDC login + JWT bearer filter)
  -> Controller -> domain service -> JPA repositories
                                 |                  |
                                 |                  +-- MySQL 8 / Flyway (source of truth)
                                 +-- Outbox -> RabbitMQ publisher (optional)
                     Redis cache (optional)
                     Spring AI -> configured LLM provider (optional)
                     Razorpay test/live gateway configuration
```

## Main modules

- `auth`: password registration/login, Google OIDC identity mapping, single-use OAuth exchange codes, JWT access tokens, HttpOnly refresh cookies, origin checks and token revocation.
- `catalog`: movies, theatres, screens, seats, showtimes, inventory and search.
- `booking`: seat-hold lifecycle, database row locking, coupon calculation, payment workflows, history, cancellation and deterministic seat recommendation.
- `payment`: development simulator, Razorpay orders, payment signature verification, webhook deduplication and refund requests.
- `events`: transaction-bound outbox rows and optional RabbitMQ publication with bounded retry tracking.
- `dashboard`: role-aware counts, partner-owned showtime summaries, admin role/catalog controls and audit events.
- `ai`: Spring AI `ChatClient` assistant using actual upcoming showtime data and fail-closed configuration/provider error handling.

## Integrations and deliberate limits

- MySQL is authoritative. The database holds unique `(showtime_id, seat_id)` inventory rows and booking/hold relationships. The booking service uses database transactions and pessimistic locks for critical seat/payment transitions.
- Redis is an optional movie-detail cache. It is not seat ownership authority.
- RabbitMQ is an optional outbox publisher. Delivery is at least once, not exactly once; consumers must be idempotent.
- Google OIDC uses the authorization-code flow. `sub` is the provider identity; new accounts receive only the `CUSTOMER` role. Existing account linking requires a CineBook-verified local email.
- The refresh credential is stored hashed in MySQL and delivered only in an HttpOnly cookie. The access JWT is short-lived and held in tab-scoped storage by the browser.
- AI is optional. Explicit city/genre/budget/time constraints are filtered against showtime data before the LLM call. The model is instructed not to invent data, but prompts do not guarantee zero hallucinations; the UI displays only returned database catalogue records as cards.
- Deterministic seat recommendations are separate from the LLM. Predictive demand forecasting, automated AI seat assignment, review intelligence and AI partner business insights are not included in this release.
- Partner UI currently provides owned-showtime views. Full theatre/screen/seat/showtime CRUD is not implemented. Admin UI currently provides user-role and audit views; admin APIs also include movie create/active operations, but the React UI does not yet expose every operation.
- Notification records are persisted; the included mail workflow covers account welcome/sign-in/verification messaging, not full multi-channel push/SMS delivery.
- The original vanilla frontend is archived in `frontend-legacy/` and is not part of active Docker/Vercel deployments.
