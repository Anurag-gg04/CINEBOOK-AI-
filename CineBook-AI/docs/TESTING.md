# Testing

## Commands

Backend: `cd backend; mvn test` and `mvn package`. Frontend: `cd frontend; npm run check; npm test; npm run build`. The static HTML/CSS/vanilla JavaScript frontend has no runtime npm dependencies. Docker: `docker compose config`, then `docker compose up --build`.

## Current automated tests

The Java test suite contains unit tests for fee arithmetic, deterministic seat recommendation/accessibility/budget handling, expired/cancelled hold checks, and API error normalization. A Spring Boot/H2 integration test source exercises simultaneous seat holds and same-key hold replay. The Node test runner currently includes seven checks across the static entry point, all four role-specific dashboard layouts, API wiring, password-strength interaction, cache behavior, and the email-verification flow. See `VERIFICATION_REPORT.md` for the commands run in this environment and the live integrations that still need a local backend/database. They do not replace real-MySQL concurrency validation or a gateway sandbox test.

## Manual critical-path checklist

1. Register a new user or sign in as `customer@cinebook.local`.
2. Open a movie, pick a showtime, choose at least one AVAILABLE seat, and create a hold.
3. Verify a visible five-minute countdown; refresh and confirm the API still reports the hold.
4. Apply `WELCOME10` for an eligible hold and verify the quote comes from backend values.
5. Simulate decline; ensure there is no booking. Retry with a fresh idempotency key only while the same active hold remains valid.
6. Simulate success; verify ticket, booking history, and seats marked BOOKED.
7. Repeat two clients contending for one seat; exactly one should create the hold.
8. Wait for a hold to expire; verify checkout/payment refuses expired hold and inventory is released.
9. Verify a different account cannot read another user's hold/ticket or cancel their booking.
10. Login as partner/admin/operations and confirm role-specific dashboard data. Admin actions should appear in audit logs.
11. In Razorpay test mode only, verify order creation, checkout signature, duplicate webhook handling and refund state against the Razorpay dashboard.

## Performance

`performance/cinebook-booking.jmx` is a JMeter starter plan. Set backend URL, IDs, access token and idempotency test policy before load generation. Do not run load tests against a production gateway or real payment credentials. Establish a baseline on a disposable database first.
