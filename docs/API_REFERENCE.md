# API reference

Before using the Postman collection request `Login seeded customer`, set its `demoAccountPassword` collection variable to the same local-only value configured as `DEMO_ACCOUNT_PASSWORD` in your uncommitted `.env` file. Development API base URL: `http://localhost:8080/api`. JSON errors use the global error handler. Authentication endpoints may return `{ "code": "UNAUTHENTICATED", "message": "Authentication is required" }`. Send `X-Correlation-ID` for trace correlation and `Idempotency-Key` for hold/payment commands. Swagger UI is `/swagger-ui.html` in local mode when docs are enabled; it is disabled in the production profile.

## Public catalogue

| Method | Path | Purpose |
|---|---|---|
| GET | `/movies?q=&language=&genre=&page=0&size=24&sort=rating` | Search and paginate active movies |
| GET | `/movies/{id}` | Movie details |
| GET | `/theatres?city=` | Browse active theatres |
| GET | `/shows?movieId=&city=` | Browse upcoming showtimes |
| GET | `/shows/{id}` | Showtime detail |
| GET | `/shows/{id}/seats` | Current seat inventory and prices |
| POST | `/shows/{id}/recommendations` | Recommend real available seat combinations |
| GET | `/payments/options` | Public payment-mode metadata |

## Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/register` | Create CUSTOMER account; on successful signup sets refresh cookie. With required email verification, token issuance waits until verification. |
| POST | `/auth/verify-email` | Consume single-use email verification token |
| POST | `/auth/login` | Verify credentials and set HttpOnly refresh cookie; response includes access token, not refresh token |
| GET | `/auth/google/status` | Report whether backend Google credentials are configured |
| GET | `/oauth2/authorization/google` | Start Google OIDC authorization-code flow (outside `/api`) |
| GET | `/login/oauth2/code/google` | Google callback (outside `/api`; routed by same-origin proxy) |
| POST | `/auth/oauth/exchange` | Consume short-lived one-time Google code; sets refresh cookie |
| POST | `/auth/refresh` | Rotate the refresh cookie and issue a new access token |
| POST | `/auth/logout` | Revoke refresh token and clear refresh cookie |
| GET | `/auth/me` | Current account (bearer token required) |
| PATCH | `/auth/me` | Update display profile (bearer token required) |

For browser-originated registration/login/refresh/logout/Google-exchange requests, the `Origin` or `Referer` must match one of `CORS_ALLOWED_ORIGINS`. Refresh cookie is `HttpOnly`, SameSite configurable (default Lax), Path `/`, and Secure in production. Browser code must not read or store the refresh token.

## Holds and booking (bearer access token required)

| Method | Path | Purpose |
|---|---|---|
| POST | `/shows/{showId}/holds` | Hold up to eight seat IDs; send `Idempotency-Key` |
| GET | `/holds/{token}` | Read own hold status |
| GET | `/holds/{token}/quote?couponCode=` | Price quote for own hold |
| POST | `/payments/simulator` | `decision: APPROVE|DECLINE`; development profile only |
| GET | `/bookings` | Current user's booking history |
| GET | `/bookings/{id}` | Current user's ticket |
| POST | `/bookings/{id}/cancel` | Cancel eligible booking; simulator refund or Razorpay refund request |

## Razorpay and AI

| Method | Path | Purpose |
|---|---|---|
| POST | `/payments/razorpay/orders` | Backend-created Razorpay order; send `Idempotency-Key` |
| POST | `/payments/razorpay/verify` | Server validates order/payment/signature |
| POST | `/payments/razorpay/webhook` | Signed webhook with `X-Razorpay-Signature` and event ID |
| GET | `/ai/status` | Report AI provider configuration status |
| POST | `/ai/assistant` | Natural-language discovery request against live showtime catalogue |

AI returns HTTP 503 when no key is configured or provider is unavailable. It does not book or hold seats.

## Dashboards, administration and notifications

| Method | Path | Access |
|---|---|---|
| GET | `/dashboard/summary` | Authenticated; records scoped by role |
| GET | `/dashboard/partner/shows` | THEATRE_PARTNER or ADMIN; own partner showtimes |
| GET | `/admin/users` | ADMIN |
| PATCH | `/admin/users/{id}/role` | ADMIN; role change is audited |
| POST | `/admin/movies` | ADMIN; creates a catalogue movie |
| PATCH | `/admin/movies/{id}/active?active=` | ADMIN; toggles movie visibility |
| GET | `/admin/audit` | ADMIN; recent audit records |
| GET | `/notifications` | Authenticated; own notification list |
| GET | `/notifications/unread-count` | Authenticated; own unread count |
| POST | `/notifications/{id}/read` | Authenticated owner |

Health endpoints include `/actuator/health` and `/actuator/health/readiness`; do not expose Actuator or API documentation publicly in production.
