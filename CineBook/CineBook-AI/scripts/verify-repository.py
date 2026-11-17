#!/usr/bin/env python3
"""Offline structural checks; not a replacement for Maven, Vite or E2E tests."""
from __future__ import annotations
import json, re, sys
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
errors: list[str] = []
checks = 0

def check(condition: bool, message: str) -> None:
    global checks
    checks += 1
    if not condition:
        errors.append(message)

def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding='utf-8')

required = [
    'README.md', '.env.example', '.env.production.example', 'docker-compose.yml',
    'docker-compose.production.yml', 'backend/pom.xml', 'backend/Dockerfile',
    'backend/src/main/resources/application.yml', 'backend/src/main/resources/db/migration/V1__initial_schema.sql',
    'backend/src/main/resources/db/migration/V3__google_oauth_identity_and_login_codes.sql',
    'frontend/package.json', 'frontend/index.html', 'frontend/vercel.json',
    'frontend/src/main.tsx', 'frontend/src/App.tsx', 'frontend/src/pages/HomePage.tsx',
    'frontend/src/pages/MoviePage.tsx', 'frontend/src/pages/AuthCallbackPage.tsx',
    'frontend/src/pages/AdminPage.tsx', 'frontend/src/pages/PartnerPage.tsx', 'frontend/src/pages/VerifyEmailPage.tsx',
    'frontend/lib/proxy.js', 'frontend/api/[...path].js',
    'frontend/api/oauth2/[...path].js', 'frontend/api/login/oauth2/[...path].js',
    'frontend/Dockerfile', 'frontend/nginx.conf', 'frontend/.dockerignore',
    'frontend-legacy/app.js', 'frontend-legacy/server.mjs',
    'docs/ARCHITECTURE.md', 'docs/API_REFERENCE.md', 'docs/DATABASE_DESIGN.md',
    'docs/BOOKING_CONSISTENCY.md', 'docs/PAYMENT_WORKFLOW.md', 'docs/SECURITY.md',
    'docs/TESTING.md', 'docs/TROUBLESHOOTING.md', 'docs/VERIFICATION_REPORT.md',
    'docs/GOOGLE_OAUTH.md', 'docs/AI_FEATURES.md', 'docs/VERCEL_DEPLOYMENT.md',
    'docs/PROJECT_REPORT.md', 'docs/PERFORMANCE.md', 'docs/MAJOR_PROJECT_DEMO.md', 'docs/diagrams/data-flow.mmd',
    'performance/cinebook-booking.jmx', 'postman/CineBook-AI.postman_collection.json',
    '.github/workflows/ci.yml', 'scripts/Start-CineBook.ps1', 'scripts/run-local.ps1'
]
for rel in required:
    check((ROOT / rel).is_file(), f'missing required file: {rel}')

for rel in ['frontend/package.json', 'frontend/vercel.json', 'postman/CineBook-AI.postman_collection.json']:
    try:
        json.loads(read(rel))
        check(True, f'valid JSON: {rel}')
    except Exception as exc:
        check(False, f'invalid JSON {rel}: {exc}')

try:
    ET.parse(ROOT / 'backend/pom.xml')
    check(True, 'backend/pom.xml parses as XML')
except Exception as exc:
    check(False, f'backend/pom.xml XML error: {exc}')

pom = read('backend/pom.xml')
check('<artifactId>spring-boot-starter-oauth2-client</artifactId>' in pom, 'Spring Security OAuth2 client dependency is missing')
check('<artifactId>spring-ai-starter-model-openai</artifactId>' in pom, 'Spring AI OpenAI starter is missing')
check('<java.version>21</java.version>' in pom and '<version>3.4.4</version>' in pom, 'Java/Spring Boot baseline changed unexpectedly')

v1 = read('backend/src/main/resources/db/migration/V1__initial_schema.sql')
for table in ['users','movies','theatres','screens','seats','showtimes','seat_holds','show_seats','bookings','payments','refund_records','outbox_events','coupons','audit_events','notifications','payment_webhook_events']:
    check(bool(re.search(r'CREATE\s+TABLE\s+' + re.escape(table) + r'\b', v1, re.I)), f'V1 missing table {table}')
check('uq_show_seat' in v1.lower() or re.search(r'unique\s*\(\s*showtime_id\s*,\s*seat_id\s*\)', v1, re.I) is not None, 'V1 lacks unique showtime-seat constraint')
check(re.search(r'\bis_accessible\s+BOOLEAN\b', v1, re.I) is not None, 'seat accessibility column must avoid MySQL reserved word ACCESSIBLE')
v3 = read('backend/src/main/resources/db/migration/V3__google_oauth_identity_and_login_codes.sql')
check('CREATE TABLE oauth_identities' in v3 and 'uq_oauth_provider_subject' in v3, 'Google provider identity migration is missing uniqueness constraints')
check('CREATE TABLE oauth_login_codes' in v3 and 'code_hash CHAR(64)' in v3, 'one-time OAuth code migration is missing hashed code storage')

java_paths = list((ROOT / 'backend/src/main/java').rglob('*.java'))
java = '\n'.join(path.read_text(encoding='utf-8') for path in java_paths)
check('@Lock(LockModeType.PESSIMISTIC_WRITE)' in java, 'pessimistic database locking not present')
check('Idempotency-Key' in java or 'idempotencyKey' in java, 'idempotency handling not found')
check('HmacSHA256' in java, 'gateway HMAC verification not found')
check('@Scheduled' in java, 'scheduled expiration/retry task not found')
check('findByEmailIgnoreCaseForUpdate' in java, 'per-user lock for booking hold idempotency not found')
check('LockModeType.PESSIMISTIC_WRITE' in read('backend/src/main/java/com/cinebook/auth/RefreshTokenRepository.java'), 'refresh-token rotation lookup is not locked')
check('issuerUri("https://accounts.google.com")' in read('backend/src/main/java/com/cinebook/config/GoogleOAuthConfiguration.java'), 'Google OIDC issuer URI is not configured')
check('redirectUri == null || redirectUri.isBlank()' in read('backend/src/main/java/com/cinebook/config/GoogleOAuthConfiguration.java'), 'blank Google redirect env must fall back to the forwarded base URL')
check('email_verified' in java and 'getAudience()' in java, 'Google OIDC email/audience validation is missing')
check('openid' in read('backend/src/main/java/com/cinebook/config/GoogleOAuthConfiguration.java'), 'Google OIDC openid scope is missing')
check('Role.CUSTOMER' in read('backend/src/main/java/com/cinebook/auth/GoogleAccountService.java'), 'new Google users are not assigned CUSTOMER by default')
check('HttpOnly' in read('docs/GOOGLE_OAUTH.md') and '.httpOnly(true)' in read('backend/src/main/java/com/cinebook/auth/AuthController.java'), 'refresh cookie should be HttpOnly')
check('SameSite' in read('docs/GOOGLE_OAUTH.md') and '.sameSite(refreshCookieSameSite)' in read('backend/src/main/java/com/cinebook/auth/AuthController.java'), 'refresh cookie SameSite policy missing')
check('new AuthDtos.TokenResponse(tokens.accessToken(), null' in read('backend/src/main/java/com/cinebook/auth/AuthController.java'), 'refresh token must not be returned to browser JavaScript')
check('chatClient.prompt()' in read('backend/src/main/java/com/cinebook/ai/AiAssistantService.java'), 'Spring AI ChatClient request is not implemented')
check('showtimes.browse(Instant.now(), null, null)' in read('backend/src/main/java/com/cinebook/ai/AiAssistantService.java'), 'AI assistant does not read live showtimes from the database')
check('SERVICE_UNAVAILABLE' in read('backend/src/main/java/com/cinebook/ai/AiAssistantService.java'), 'AI provider failure is not handled explicitly')
check('PESSIMISTIC_WRITE' in java, 'seat booking concurrency requires a pessimistic database lock')

front_pkg = json.loads(read('frontend/package.json'))
check(front_pkg.get('dependencies', {}).get('react') is not None and front_pkg.get('devDependencies', {}).get('vite') is not None, 'React/Vite dependencies missing')
check('"build": "tsc -b && vite build"' in read('frontend/package.json'), 'production build must run TypeScript project checks and Vite')
vercel = json.loads(read('frontend/vercel.json'))
check(any(rule.get('source') == '/oauth2/:path*' for rule in vercel.get('rewrites', [])), 'Vercel OAuth authorization rewrite missing')
check(any(rule.get('source') == '/login/oauth2/:path*' for rule in vercel.get('rewrites', [])), 'Vercel OAuth callback rewrite missing')
check(any(rule.get('destination') == '/index.html' for rule in vercel.get('rewrites', [])), 'Vercel SPA deep-link fallback missing')
proxy = read('frontend/lib/proxy.js')
for token in ['BACKEND_BASE_URL', 'x-forwarded-host', 'x-forwarded-proto', 'getSetCookie', 'Cookie']:
    check(token in proxy, f'Vercel proxy missing {token}')
check("'GOOGLE_CLIENT_SECRET'" not in read('frontend/src/lib/api.ts') and 'AI_API_KEY' not in read('frontend/src/lib/api.ts'), 'backend secrets are referenced in frontend bundle source')
check('credentials: \'same-origin\'' in read('frontend/src/lib/api.ts'), 'frontend API requests must use same-origin cookies')
check('exchangeStarted.current = true' in read('frontend/src/pages/AuthCallbackPage.tsx'), 'one-time Google code exchange must be protected from StrictMode effect replay')
check('started.current = true' in read('frontend/src/pages/VerifyEmailPage.tsx'), 'single-use email verification must be protected from StrictMode effect replay')
check('bodyParser: false' in read('frontend/api/[...path].js'), 'Vercel API proxy must disable body parsing to preserve signed webhook bytes')
check('X-Forwarded-Host $http_host' in read('frontend/nginx.conf'), 'Nginx must preserve the public host port for local OAuth callback URLs')
check("path(\"/\")" in read('backend/src/main/java/com/cinebook/auth/AuthController.java'), 'refresh cookie Path must be root to cover the Vercel proxy')

compose = read('docker-compose.yml')
prod = read('docker-compose.production.yml')
check('build: ./frontend' in compose, 'local Compose must build the React frontend')
check('context: ./frontend' in prod, 'production Compose must build the React frontend')
check('RABBITMQ_DEFAULT_USER' in compose and 'RABBITMQ_DEFAULT_PASS' in compose, 'local Compose must set a non-guest RabbitMQ user')
check('APP_SEED_ENABLED: "false"' in prod, 'production must disable demonstration seeding')
check('REFRESH_COOKIE_SECURE: ${REFRESH_COOKIE_SECURE:-true}' in prod, 'production refresh cookie must default to Secure')
check('SESSION_COOKIE_SECURE: ${SESSION_COOKIE_SECURE:-true}' in prod, 'production OAuth session cookie must default to Secure')
check(all(token not in prod for token in ['3306:3306', '6379:6379', '5672:5672', '15672:15672', '8080:8080']), 'production Compose must not publish private services')

# Keep code/config artifacts free of accidental merge conflict markers and empty sources.
for base in ['backend/src/main/java', 'backend/src/main/resources', 'frontend/src']:
    for path in (ROOT / base).rglob('*'):
        if path.is_file() and path.suffix in {'.java','.tsx','.ts','.css','.sql','.yml'}:
            content = path.read_text(encoding='utf-8')
            check('<<<<<<<' not in content and '>>>>>>>' not in content, f'conflict markers in {path.relative_to(ROOT)}')
            check(content.strip() != '', f'empty source file {path.relative_to(ROOT)}')

print(f'Offline repository checks: {checks} assertions, {len(errors)} failure(s)')
for error in errors:
    print('FAIL:', error)
if errors:
    sys.exit(1)
print('PASS: required sources, OAuth/AI configuration, deployment paths and selected safety invariants are present.')
print('NOTE: these checks do not compile Java/TypeScript or execute integration/browser flows.')
