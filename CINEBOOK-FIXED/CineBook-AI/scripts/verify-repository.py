#!/usr/bin/env python3
"""Offline structural checks; deliberately not a substitute for framework builds/tests."""
from __future__ import annotations
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
checks = 0

def check(condition: bool, message: str) -> None:
    global checks
    checks += 1
    if not condition:
        errors.append(message)

for rel in [
    'README.md', '.env.example', 'docker-compose.yml', 'backend/pom.xml',
    'scripts/run-local.ps1', 'scripts/Start-CineBook.ps1',
    'backend/Dockerfile', 'backend/src/main/resources/db/migration/V1__initial_schema.sql',
    'frontend/package.json', 'frontend/Dockerfile', 'frontend/index.html', 'frontend/styles.css', 'frontend/app.js', 'frontend/server.mjs', 'frontend/scripts/verify-static.mjs',
    'docs/ARCHITECTURE.md', 'docs/API_REFERENCE.md', 'docs/DATABASE_DESIGN.md',
    'docs/BOOKING_CONSISTENCY.md', 'docs/PAYMENT_WORKFLOW.md', 'docs/SECURITY.md',
    'docs/TESTING.md', 'docs/TROUBLESHOOTING.md', 'docs/VERIFICATION_REPORT.md',
    'docs/INTERVIEW_PREPARATION.md', 'performance/cinebook-booking.jmx',
    'postman/CineBook-AI.postman_collection.json', '.github/workflows/ci.yml',
    'backend/src/test/java/com/cinebook/booking/BookingServiceTest.java',
    'backend/src/test/java/com/cinebook/booking/SeatRecommendationServiceTest.java',
    'backend/src/test/java/com/cinebook/booking/SeatHoldStateTest.java',
    'backend/src/test/java/com/cinebook/booking/SeatHoldConcurrencyIntegrationTest.java'
]:
    check((ROOT / rel).is_file(), f'missing required file: {rel}')

for rel in ['frontend/package.json', 'postman/CineBook-AI.postman_collection.json']:
    try:
        json.loads((ROOT / rel).read_text(encoding='utf-8'))
        check(True, f'valid JSON: {rel}')
    except Exception as e:
        check(False, f'invalid JSON {rel}: {e}')

pom = ROOT / 'backend/pom.xml'
try:
    import xml.etree.ElementTree as ET
    ET.parse(pom)
    check(True, 'backend/pom.xml parses as XML')
except Exception as e:
    check(False, f'backend/pom.xml XML error: {e}')

migration = (ROOT / 'backend/src/main/resources/db/migration/V1__initial_schema.sql').read_text(encoding='utf-8')
for table in ['users','movies','theatres','screens','seats','showtimes','seat_holds','show_seats','bookings','payments','refund_records','outbox_events','coupons','audit_events','notifications','payment_webhook_events']:
    check(bool(re.search(r'CREATE\s+TABLE\s+' + re.escape(table) + r'\b', migration, re.I)), f'migration missing table {table}')
check('uq_show_seat' in migration.lower() or re.search(r'unique\s*\(\s*showtime_id\s*,\s*seat_id\s*\)', migration, re.I) is not None, 'migration needs unique showtime-seat constraint')
check(re.search(r'\bis_accessible\s+BOOLEAN\b', migration, re.I) is not None, 'seat accessibility column must avoid MySQL reserved word ACCESSIBLE')

java = '\n'.join(p.read_text(encoding='utf-8') for p in (ROOT/'backend/src/main/java').rglob('*.java'))
seat_entity = (ROOT/'backend/src/main/java/com/cinebook/catalog/Seat.java').read_text(encoding='utf-8')
check('@Column(name="is_accessible"' in seat_entity, 'Seat entity must map its accessible field to the non-reserved is_accessible database column')
check('PESSIMISTIC_WRITE' in java, 'pessimistic row lock is not present')
check('Idempotency-Key' in java or 'idempotencyKey' in java, 'idempotency handling not found')
check('HmacSHA256' in java, 'gateway HMAC verification not found')
check('@Scheduled' in java, 'scheduled expiration/retry task not found')
check('accessToken' in java and 'RefreshToken' in java, 'token lifecycle types not found')
check('cacheable' in java.lower(), 'optional cache integration not found')
check('findByEmailIgnoreCaseForUpdate' in java, 'per-user lock for hold idempotency not found')
check('LockModeType.PESSIMISTIC_WRITE' in (ROOT/'backend/src/main/java/com/cinebook/auth/RefreshTokenRepository.java').read_text(encoding='utf-8'), 'refresh-token rotation query is not locked')
check('version BIGINT NOT NULL DEFAULT 0' in migration, 'coupon optimistic-lock version column is missing')
pom_text = pom.read_text(encoding='utf-8')
dockerfile_text = (ROOT/'backend/Dockerfile').read_text(encoding='utf-8')
check('<artifactId>cinebook-api</artifactId>' in pom_text and 'target/cinebook-api-*.jar' in dockerfile_text, 'backend Dockerfile artifact pattern must match Maven artifactId')
check('node --check app.js' in (ROOT/'frontend/package.json').read_text(encoding='utf-8') and 'node --check server.mjs' in (ROOT/'frontend/package.json').read_text(encoding='utf-8'), 'frontend checks must validate the vanilla JavaScript app and server')
check('RABBITMQ_DEFAULT_USER' in (ROOT/'docker-compose.yml').read_text(encoding='utf-8'), 'Compose must provision a non-guest RabbitMQ user for inter-container access')
check('RABBITMQ_DEFAULT_PASS' in (ROOT/'docker-compose.yml').read_text(encoding='utf-8'), 'Compose must provision the RabbitMQ password matching backend settings')
check('curl --fail --silent' in (ROOT/'docker-compose.yml').read_text(encoding='utf-8'), 'backend healthcheck must use an installed HTTP client')
check('apt-get install -y --no-install-recommends curl' in (ROOT/'backend/Dockerfile').read_text(encoding='utf-8'), 'backend runtime image must include curl for its healthcheck')
check('Java 26 is not rejected' in (ROOT/'scripts/run-local.ps1').read_text(encoding='utf-8'), 'local launcher must accept compatible newer Java runtimes')
security = (ROOT/'backend/src/main/java/com/cinebook/config/SecurityConfig.java').read_text(encoding='utf-8')
check('requestMatchers("/api/auth/**"' not in security, 'profile endpoint must not be included in public auth matcher')

# Catch unresolved accidental conflict markers and empty source files.
for base in ['backend/src/main/java','backend/src/main/resources']:
    for path in (ROOT/base).rglob('*'):
        if path.is_file() and path.suffix in {'.java','.tsx','.ts','.css','.sql','.yml'}:
            text = path.read_text(encoding='utf-8')
            check('<<<<<<<' not in text and '>>>>>>>' not in text, f'conflict markers in {path.relative_to(ROOT)}')
            check(text.strip() != '', f'empty source file {path.relative_to(ROOT)}')

# Static frontend source checks (HTML/CSS/vanilla JS; no React entry point).
for rel in ['frontend/index.html', 'frontend/styles.css', 'frontend/app.js', 'frontend/server.mjs']:
    source = ROOT / rel
    if source.is_file():
        content = source.read_text(encoding='utf-8')
        check('<<<<<<<' not in content and '>>>>>>>' not in content, f'conflict markers in {rel}')
        check(content.strip() != '', f'empty frontend source: {rel}')
check(not (ROOT/'frontend/src').exists(), 'obsolete React source tree should not be shipped with the vanilla frontend')

# Production deployment and fail-closed payment invariants.
prod_compose = (ROOT/'docker-compose.production.yml').read_text(encoding='utf-8')
prod_profile = (ROOT/'backend/src/main/resources/application-prod.yml').read_text(encoding='utf-8')
booking_service = (ROOT/'backend/src/main/java/com/cinebook/booking/BookingService.java').read_text(encoding='utf-8')
payment_service = (ROOT/'backend/src/main/java/com/cinebook/payment/RazorpayPaymentService.java').read_text(encoding='utf-8')
nginx = (ROOT/'frontend/nginx.conf').read_text(encoding='utf-8')
frontend_app = (ROOT/'frontend/app.js').read_text(encoding='utf-8')
check(all(token not in prod_compose for token in ['3306:3306', '6379:6379', '5672:5672', '15672:15672', '8080:8080']), 'production compose must not publish database/cache/broker/backend host ports')
check('127.0.0.1:${WEB_PORT:-8088}:80' in prod_compose, 'production web container must bind to loopback for edge TLS termination')
check('maximum-pool-size: ${DB_POOL_SIZE:12}' in (ROOT/'backend/src/main/resources/application.yml').read_text(encoding='utf-8'), 'Hikari connection pool size must be configurable through DB_POOL_SIZE')
check('simulator-enabled: false' in prod_profile, 'production profile must disable the payment simulator')
check('contains("prod")' in booking_service and 'contains("prod")' in payment_service, 'backend payment services must enforce the production simulator guard')
check("mode: 'UNAVAILABLE', simulatorEnabled: false" in frontend_app, 'frontend must fail closed when payment options cannot be loaded')
check('location ^~ /actuator/ { return 404; }' in nginx and 'location ^~ /v3/api-docs { return 404; }' in nginx, 'public web container must block management and API documentation paths')
check((ROOT/'docs/DEPLOYMENT.md').is_file() and (ROOT/'.env.production.example').is_file(), 'production deployment guide and sample environment must exist')

print(f'Offline repository checks: {checks} assertions, {len(errors)} failure(s)')
for err in errors:
    print('FAIL:', err)
if errors:
    sys.exit(1)
print('PASS: repository structure, selected schema invariants, and configuration artifacts are present.')
print('NOTE: these checks do not compile the Java backend or execute end-to-end application flows.')
