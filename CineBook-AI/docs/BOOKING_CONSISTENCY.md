# Booking consistency and seat ownership

## Source of truth

MySQL `show_seats` rows are authoritative for availability. Redis is not used as an inventory lock. Each show has one row per physical seat, enforced by a unique `(showtime_id, seat_id)` index. Availability is computed by reading those rows; unavailable held/booked seats cannot be recommended.

## Hold workflow

1. The authenticated customer sends show ID, seat IDs and an `Idempotency-Key`.
2. The service validates ownership-independent show status/seat selection, loads the selected inventory rows under pessimistic write lock in stable seat-ID order, verifies availability, assigns a random unguessable hold token and expiration, marks rows HELD, and records the hold in one transaction.
3. Other customers serialize on overlapping inventory rows. The transaction that sees a non-available seat fails with conflict rather than selling that seat.
4. The hold expires after `SEAT_HOLD_MINUTES` (default 5). A scheduled cleanup marks active expired holds EXPIRED and releases their still-associated HELD rows. Every pay/confirm path independently checks the expiry; scheduler timing does not decide correctness.
5. The database remains the authority if Redis is down. A client countdown is informational only.

## Payment and confirmation

- Simulator and Razorpay outcomes use a database payment record and idempotency. A booking is created only from a server-side accepted simulator decision or verified gateway signature/webhook.
- Confirmation relocks inventory rows and checks hold state, expiry, ownership of each row, and coupon validity before booking seats. If gateway funds are captured but a hold/inventory/coupon is no longer valid, the payment becomes REFUND_PENDING and a refund requirement is recorded; the booking is not falsely confirmed.
- Duplicate simulator or gateway requests return the existing result when matched by the same idempotency identity. Reusing a key for another payment returns conflict. Webhook event ID uniqueness is a second idempotency layer.
- Booking cancellation is allowed only while CONFIRMED and before show start. Simulator refund labels are explicitly simulated. Razorpay cancellation transitions to REFUND_PENDING until a gateway result is verified.

## Failure handling

A lost/ambiguous gateway response does not trigger an automatic new payment order. The payment record remains pending reconciliation, and the user receives an explicit message. Operational reconciliation is manual in this build; no scheduled Razorpay reconciliation task is claimed. Outbox delivery is at-least-once and should not be mistaken for exactly-once delivery.

## Boundaries and risks

The included repository/integration tests are starter tests and have not been run in this environment. Before production, test two independent MySQL connections contending for the same seats, lock timeout/deadlock behavior, the unique constraint and race behavior under the exact database isolation level, and payment/webhook/cancel interleavings. Consider making inventory hold creation use a short claim transaction with database constraints and defining a refund SLA.
