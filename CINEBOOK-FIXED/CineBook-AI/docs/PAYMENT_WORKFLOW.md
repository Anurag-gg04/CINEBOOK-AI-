# Payment workflows

## Development simulator

`PAYMENT_MODE=SIMULATOR` is the default. The customer explicitly selects success or decline in the UI; the server validates the hold, held seats, payment idempotency and coupon. Successful simulator payments create a booking and mark seats BOOKED. A successful simulator refund is only a development state transition — it does not move real money. The `prod` Spring profile rejects simulator requests at the backend and reports the simulator as unavailable, even if `APP_PAYMENT_SIMULATOR_ENABLED=true` is accidentally set. Do not expose this mode as a real-payment path in a public deployment.

## Razorpay test mode

Set `PAYMENT_MODE=RAZORPAY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` server-side. `GET /api/payments/options` reveals only the publishable key ID. The backend creates the order and calculates the amount from current inventory and coupon rules. The browser opens Razorpay Checkout.js, then posts the order/payment/signature response to `/api/payments/razorpay/verify`. The backend verifies `HMAC-SHA256(order_id + "|" + payment_id, key_secret)` with a constant-time comparison. Browser redirects are not proof of payment.

Webhook requests are authenticated using `X-Razorpay-Signature` and the configured secret; `X-Razorpay-Event-Id` is persisted to reject duplicate events. Webhooks can confirm payment or update failures/refunds. If a gateway response is ambiguous, the state is kept pending reconciliation rather than blindly repeating a charge. Refund records retain the gateway reference/status.

Use test credentials only. Configure webhook events `payment.captured`, `payment.failed`, `refund.processed`, `refund.failed`. Razorpay must reach a public HTTPS callback; localhost alone will not receive webhooks. Gateway order, signature, webhook and refund behavior have not been externally verified in this workspace because credentials and network access were unavailable. Manual reconciliation remains an operations task, not an implemented automatic job.
