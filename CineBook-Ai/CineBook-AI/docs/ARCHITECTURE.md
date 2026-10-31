# Architecture

## Shape

CineBook AI is a Spring Boot modular monolith, with packages grouped by domain: `auth`, `catalog`, `booking`, `payment`, `events`, `dashboard`, `common`, and `config`. The frontend is a separately deployable static HTML/CSS/vanilla JavaScript application. REST DTOs are the browser/API boundary; JPA entities remain inside the backend.

```text
Browser (HTML + CSS + vanilla JavaScript)
  -> Node static/API proxy or nginx
  -> Spring Security + JWT -> Controller -> domain service -> JPA repositories
                                      |                     |
                                      |                     +-- MySQL 8 / Flyway (source of truth)
                                      +-- outbox rows -> optional RabbitMQ publisher
                         optional Redis cache
                         optional Razorpay test gateway
```

## Main modules

- `auth`: account registration/login, password encoding, JWT access tokens and one-time refresh-token rotation/revocation.
- `catalog`: movies, theatres, screens, seats, showtimes, seat-layout API and search.
- `booking`: hold lifecycle, inventory locking, coupon calculation, simulator, booking history and deterministic recommendation.
- `payment`: simulator record and optional Razorpay orders/signature/webhook/refund path.
- `events`: transaction-bound outbox records and opt-in RabbitMQ publication with retry/dead-letter configuration.
- `dashboard`: role-aware actual counts, theatre-owned show views, admin account/catalog actions and audit events.

## Integrations and deliberate limits

- MySQL is authoritative. The database holds a unique `(showtime_id, seat_id)` inventory row, hold/booking foreign keys and idempotency uniqueness.
- Redis is an optional cache for movie detail reads. `APP_REDIS_ENABLED` controls the Redis cache manager. It is not seat ownership authority.
- RabbitMQ is optional and disabled by default in direct local configuration; when enabled, the outbox publisher publishes pending events and retries with bounded attempt tracking. Delivery is at least once, not exactly once. Consumers should be idempotent.
- AI recommendations are deterministic and local. There is no external LLM dependency.
- The project uses denormalized comma-separated movie genres and language/city strings for this portfolio build, rather than separate genre/language/city tables. This simplification is an acknowledged schema limitation.
- Theatre partner dashboard exposes owned schedule/revenue views and CSV export, but not screen, seat, show scheduling, or tariff mutation endpoints. Admin movie creation/activation and user-role changes are included.
- Notification records are persisted, but no email/SMS/push provider is integrated.
