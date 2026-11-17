# Performance and scale plan

## Architectural foundations currently present

- MySQL indexes and constraints support lookup and seat-inventory consistency.
- Spring Data repositories paginate movie catalogue search.
- Hikari connection-pool size is configurable through `DB_POOL_SIZE`.
- Redis cache support is configurable for cacheable catalogue lookups.
- RabbitMQ/outbox support exists for asynchronous side effects when enabled.
- Booking and payment commands accept idempotency keys where the backend requires them.
- `performance/cinebook-booking.jmx` contains a starter JMeter plan for booking/load scenarios.

## Targets (not measured results)

The product brief's design targets are retained as goals only:

- 1,000,000 registered accounts.
- 10,000 concurrent virtual users as a load-test scenario.
- Read API p95 below 300 ms.
- Booking API p95 below 800 ms, excluding external payment-provider latency.

No throughput, percentile, concurrent-user or availability result is claimed by this release. No load test was executed in the preparation environment.

## Before scale testing

1. Deploy multiple backend replicas with a managed MySQL 8 database and correctly sized connection pools.
2. Use shared Redis-backed rate limits and cache invalidation; the current login/register throttles are process-local.
3. Verify outbox claiming and message-consumer idempotency across multiple workers.
4. Run MySQL two-user seat contention tests with the production isolation level and realistic data volume.
5. Load test catalogue/search separately from booking and payment commands; report external-provider latency separately.
6. Observe JVM heap/GC, connection saturation, DB query latency/locks, Redis hit ratio, RabbitMQ queue depth, pending outbox rows, API error rate and p50/p95/p99 latency.
7. Publish only test-run measurements with the environment, data volume, ramp-up, duration and JMeter report attached.
