# API reference

Base URL in development: `http://localhost:8080/api`. JSON errors use the global error handler; auth failures may be returned by Spring Security as `{ "code": "UNAUTHENTICATED", "message": "Authentication is required" }`. Send `X-Correlation-ID` for trace correlation and `Idempotency-Key` for hold/payment commands. Swagger UI: `/swagger-ui.html`.

## Public catalog

| Method | Path | Purpose |
|---|---|---|
| GET | `/movies?q=&language=&genre=&page=0&size=24&sort=rating` | Search/paginate active movies |
| GET | `/movies/{id}` | Movie details |
| GET | `/theatres?city=` | Browse theatres |
| GET | `/shows?movieId=&city=` | Browse showtimes |
| GET | `/shows/{id}` | Showtime detail |
| GET | `/shows/{id}/seats` | Seat inventory and prices for a show |
| POST | `/shows/{id}/recommendations` | Recommend real available seat combinations |
| GET | `/payments/options` | Available payment modes; public metadata only |

## Authentication (public unless noted)

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Register CUSTOMER account; in local mode response contains `tokens`, `emailSent`, and a message; when verification is required it returns `verificationRequired: true` and withholds tokens until verified |
| POST | `/auth/verify-email` | Verify a single-use email token; public endpoint, token expires after 30 minutes |
| POST | `/auth/login` | Sign in; returns access + refresh tokens; production accounts must have a verified email |
| POST | `/auth/refresh` | Rotate a single-use refresh token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Current account |
| PATCH | `/auth/me` | Update profile fields |

## Holds and booking (bearer access token required)

| Method | Path | Purpose |
|---|---|---|
| POST | `/shows/{showId}/holds` | Hold seat IDs; send `Idempotency-Key` |
| GET | `/holds/{token}` | Read hold status and seats (owner only) |
| GET | `/holds/{token}/quote?couponCode=` | Price quote (owner only) |
| POST | `/payments/simulator` | `decision: APPROVE|DECLINE`; development mode only, idempotent |
| GET | `/bookings` | Current user's history |
| GET | `/bookings/{id}` | Current user's ticket |
| POST | `/bookings/{id}/cancel` | Cancel eligible booking; simulator refund or Razorpay refund request |

## Optional Razorpay test mode

| Method | Path | Purpose |
|---|---|---|
| POST | `/payments/razorpay/orders` | Backend-created order; `Idempotency-Key` required |
| POST | `/payments/razorpay/verify` | Server validates order/payment/signature |
| POST | `/payments/razorpay/webhook` | Signed gateway webhook; requires `X-Razorpay-Signature` and `X-Razorpay-Event-Id` |

## Dashboards and admin

| Method | Path | Access |
|---|---|---|
| GET | `/dashboard/summary` | Authenticated; data is scoped by role |
| GET | `/partner/shows` | THEATRE_PARTNER or ADMIN; owned venues only |
| GET | `/admin/users` | ADMIN |
| PATCH | `/admin/users/{id}/role` | ADMIN; audited |
| POST | `/admin/movies` | ADMIN; audited |
| PATCH | `/admin/movies/{id}/active?active=` | ADMIN; audited |
| GET | `/admin/audit` | ADMIN |
| GET | `/notifications/unread-count` | Authenticated |
| POST | `/notifications/{id}/read` | Authenticated owner |

Operational endpoints include `/actuator/health`, `/actuator/health/readiness`, `/actuator/metrics`, `/v3/api-docs`, and `/swagger-ui.html`.
