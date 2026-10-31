# CineBook AI deployment guide

## Deployment model

For a single-server deployment, use `docker-compose.production.yml` rather than the development `docker-compose.yml`. The production stack runs Spring Boot, MySQL, Redis, RabbitMQ and Nginx in a private Compose network. Only the frontend is published, bound to `127.0.0.1:8088` by default. The frontend Nginx container proxies `/api/` to the backend over the private network. Database, Redis, RabbitMQ and the backend have no public host ports.

The `prod` Spring profile requires a non-placeholder JWT secret, requires email verification, disables Swagger/OpenAPI and blocks the development payment simulator in code. The code-level simulator guard is deliberate: setting `APP_PAYMENT_SIMULATOR_ENABLED=true` in an environment variable cannot re-enable it while the `prod` profile is active.

This is a deployment baseline for a portfolio application, not a certification for handling real customers or live payments. Perform the production-hardening work at the end of this guide before launch.

## 1. Prepare the server and DNS

1. Use a Linux VPS with Docker Engine and the Docker Compose plugin installed.
2. Point the domain's DNS `A`/`AAAA` record to the VPS.
3. Permit inbound TCP ports 80 and 443 only. Do not open 3306, 6379, 5672, 15672, or 8080 to the public internet.
4. Install a host reverse proxy such as Caddy. It will terminate HTTPS and forward requests to the frontend container on `127.0.0.1:8088`.

Example Caddy site configuration (replace the hostname):

```caddy
cinebook.example.com {
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains"
    }
    reverse_proxy 127.0.0.1:8088
}
```

Caddy can provision and renew certificates automatically when the domain resolves to the server and ports 80/443 are reachable. Do not enable HSTS until HTTPS is working correctly for the domain.

## 2. Create production secrets

From the project root:

```bash
cp .env.production.example .env.production
openssl rand -base64 48
```

Paste a newly generated value into `JWT_SECRET`. Generate separate strong random passwords for MySQL, its root account, Redis, RabbitMQ and SMTP. Do not reuse one password for multiple services. Keep `.env.production` on the server only; it is ignored by Git. Never commit it, add it to a public artifact, or put backend secrets in frontend JavaScript.

Set these values in `.env.production`:

- `APP_PUBLIC_URL`: the exact public frontend origin, including `https://` and no trailing slash.
- `CORS_ALLOWED_ORIGINS`: the exact same origin.
- `MAIL_*`: a working SMTP relay and sender mailbox. Production sign-up requires successful verification-email delivery.
- `RAZORPAY_*`: Razorpay test credentials and a webhook secret. The simulator remains disabled in the production profile even if these values are missing.
- Keep `PAYMENT_MODE=RAZORPAY` for the payment integration test. Do not switch to live credentials until the payment and refund workflows are independently verified.

The example file intentionally contains invalid `CHANGE_ME` values and blank gateway credentials. It is a template, not a deployable secret set.

## 3. Validate and start the stack

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

Check logs and readiness:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.production.yml exec backend \
  curl --fail http://localhost:8080/actuator/health/readiness
```

Open `https://cinebook.example.com`. The first backend start runs Flyway migrations. The production seed is disabled; there are no demo admin, operations, partner or customer accounts.

### Bootstrap the first administrator

1. Register the intended administrator through the site using an inbox you control.
2. Complete the production email-verification link.
3. Connect to MySQL through a private/SSH tunnel or the VPS console, then promote only that verified account. Replace the email below with the exact registered address:

   ```sql
   UPDATE users
   SET role = 'ADMIN'
   WHERE LOWER(email) = LOWER('admin@example.com')
     AND enabled = TRUE
     AND email_verified = TRUE;

   SELECT ROW_COUNT() AS promoted_rows;
   ```

4. Confirm `promoted_rows` is exactly `1`, then sign in again. If it is `0`, check the address and verification status; do not remove the conditions. Record who performed the promotion and when. Never seed a known/default administrator password in production.

Do not temporarily turn on the demo seed in production.

To update the app:

```bash
git pull
docker compose --env-file .env.production -f docker-compose.production.yml up -d --build
```

Back up MySQL before deploying a migration or changing images. Do not use `docker compose down -v` on production; it deletes the named database and broker/cache volumes.

## 4. Configure Razorpay test mode

1. Configure the Razorpay test key ID and key secret as backend environment secrets.
2. Configure the webhook endpoint as `https://cinebook.example.com/api/payments/razorpay/webhook` with the same webhook secret used in `RAZORPAY_WEBHOOK_SECRET`.
3. Subscribe to `payment.captured`, `payment.failed`, `refund.processed` and `refund.failed` events.
4. Complete a test booking, verify the booking only appears after server-side signature validation, test a failed payment, test a refund, and verify duplicate webhook delivery is idempotent.
5. Confirm the `GET /api/payments/options` response reports `mode: RAZORPAY`, `razorpayEnabled: true`, and `simulatorEnabled: false` before testing checkout.

A successful browser redirect is not proof of payment. Check the gateway dashboard and CineBook's payment/booking records. The repository does not yet implement automatic scheduled reconciliation for ambiguous gateway outcomes; reconcile them manually and do not claim automated recovery.

## 5. Backups and operations

Back up the MySQL database and verify that restores work. A backup that has never been restored is not a tested backup. Keep database backups away from the VPS and encrypt them at rest. Also monitor disk space, container health, JVM memory, database connections, SMTP failures, pending outbox rows, pending/failed payments and refund states. Configure alerts outside this application.

Example manual database dump:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec -T mysql \
  sh -c 'exec mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  > cinebook-$(date +%F-%H%M).sql
```

Protect and encrypt the dump; do not leave it in a public web directory.

## Remaining work before a real public launch

- Add a first-admin bootstrap/rotation procedure that does not use a committed default password.
- Replace process-local login/registration/verification rate limiting with a shared Redis-backed limiter or enforce equivalent WAF limits at the edge.
- Move refresh tokens from `sessionStorage` to Secure, HttpOnly, SameSite cookies and add a deliberate CSRF defense, or retain the current bearer-token model only after documenting the XSS threat model.
- Add account recovery, email-delivery retries/monitoring, abuse controls and data-retention/privacy processes.
- Implement automatic payment reconciliation and robust refund retry handling; test ambiguous gateway responses and duplicate/out-of-order webhooks.
- Add pagination to unbounded endpoints such as showtime browsing, partner schedules, admin users and booking history before loading real data volumes.
- Add integration tests against MySQL 8, multi-instance concurrency tests, browser end-to-end tests, dependency/secret scanning and a restore drill.
- Configure TLS/HSTS at the edge, WAF/rate limits, centralized logs/metrics/alerts and an incident-response process.
- Complete partner theatre/screen/show management and strict ownership checks before onboarding real theatre partners.
