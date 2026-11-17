# Testing guide

## Automated suites

- `frontend/` contains Node tests for React/Vite routes, Google and AI integration wiring, live catalogue/booking API calls, one-time OAuth callback replay protection, Vercel proxy path/method/header/query forwarding, and exact raw-body forwarding for signed webhooks. Run with `cd frontend && npm test`.
- `frontend-legacy/` preserves the original static UI and has nine regression tests. It is retained as a compatibility/reference copy, not built or deployed by the active React application. Run with `cd frontend-legacy && npm test`.
- `backend/` contains the existing Java unit and integration test sources for booking calculations, validation and seat contention. Run with JDK 21 and Maven 3.9+ using `cd backend && mvn clean verify`.
- `scripts/verify-repository.py` checks important source/configuration invariants without compiling the application.

## What these tests do not prove

Node source/config tests do not perform browser automation. A TypeScript syntax-only transpile is not a typecheck or Vite build. Maven tests must run to compile Java and validate Spring wiring. Use a disposable MySQL 8 database for migration and true row-lock contention checks rather than relying only on H2. Test Google OAuth with a real registered callback and browser session. Test Razorpay in sandbox mode, including exact raw webhook signatures, duplicate and out-of-order delivery, cancellation and refunds. Use JMeter for load scenarios and report only measured results.

See [`VERIFICATION_REPORT.md`](VERIFICATION_REPORT.md) for the current environment's actual pass/fail and unavailable checks.
