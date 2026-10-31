# Database design

Flyway owns the DDL (`backend/src/main/resources/db/migration/V1__initial_schema.sql`). Hibernate uses `ddl-auto: validate`, not schema creation.

Core relationships:

- `users` is referenced by refresh tokens, theatres (partner), holds, bookings, notifications, and audit actor.
- `movies` -> `showtimes`; `theatres` -> `screens`; `screens` -> catalog `seats`; `showtimes` -> per-show `show_seats` inventory rows.
- `show_seats` carries price, state, optional hold/booking references, expiry, and optimistic version. Unique `(showtime_id, seat_id)` gives one inventory row per seat per show.
- `seat_holds` owns a selected group; its idempotency key is unique. `bookings` references a hold and has a unique booking code. Seat-state updates and booking/payment changes share a transaction.
- `payments` tracks provider, amount/currency, status, idempotency, gateway references and optional booking; refund records track status/reference. Webhook event IDs are unique for duplicate delivery protection.
- `outbox_events` stores domain messages in the same database transaction as core state changes. `audit_events` stores selected administrative actions; notifications are user-scoped records.
- `coupons` track validity windows, min/max discount, redemption limit and count.

Monetary columns use DECIMAL; API DTOs expose JSON numbers. UTC timestamps are stored as instants, and the client formats showtime values for Asia/Kolkata. MySQL foreign keys and unique indexes supplement service invariants.

The current portfolio model deliberately stores movie genres as a comma-separated field and city/language as strings. Normalizing these into dedicated lookup/link tables is a follow-up improvement; those dedicated tables are not claimed to exist in this migration. Use SQL backups and restore rehearsal before any production deployment.
