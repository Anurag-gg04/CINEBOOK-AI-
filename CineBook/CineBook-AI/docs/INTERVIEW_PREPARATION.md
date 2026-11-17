# Interview preparation — CineBook AI

## Architecture discussion

Explain why the initial system is a modular monolith rather than microservices: one deployable backend keeps booking transactions and operational complexity manageable, while domain packages maintain boundaries. MySQL remains source of truth for seat inventory, Redis is optional caching, and the outbox lets messages be published after state-changing transactions without dual-write ordering bugs.

## Booking correctness discussion

Walk through the unique per-show seat row, pessimistic row lock in deterministic ID order, hold expiry as an independent server-side condition, and rechecking inventory during payment confirmation. Browser seat state and countdown are only presentation. A booking is never created because of a client redirect; gateway signature/webhook or the explicit simulator command must be accepted by the server.

## Idempotency and failure cases

Describe the stored idempotency key, payload/owner matching, duplicate request response, duplicate webhook event ledger, and pending-reconciliation state when gateway result is ambiguous. Explain that external payment capture can happen after a hold expires; the backend must not confirm seats in that case and instead record a refund obligation.

## Distributed systems questions

- Why at-least-once outbox delivery rather than “exactly once”?
- How would you make consumers idempotent using event IDs and database constraints?
- How would you extend the in-memory login limiter to a Redis token bucket?
- How should the system behave if Redis is down but MySQL is healthy?
- Which metrics and alerts would you add for pending payments, expired holds and outbox age?

## Known trade-offs to call out honestly

This portfolio version denormalizes genres/languages/cities, has no external notification provider, exposes partner schedule reads rather than full scheduling CRUD, has manual rather than automated gateway reconciliation, and could not be tested against MySQL/RabbitMQ/Razorpay in the authoring environment. Never claim those items were verified.
