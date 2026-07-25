# Engineering Master Plans

| Priority | Initiative | Effort | Business impact | Technical benefit | Dependencies |
|---|---|---|---|---|---|
| P0 | Verify WhatsApp webhook signatures | S | Prevent forged devotee activity | Authenticated provider boundary | Raw-body HMAC handling |
| P1 | Production DB certificate verification | S | Protect data in transit | Strong TLS identity | Provider CA configuration |
| P1 | CI quality and migration gates | M | Safer releases | Automated lint/type/test/build/schema checks | CI provider |
| P1 | Rate limits and request-size limits | M | Abuse resilience | Predictable boundary load | Shared limiter/store |
| P2 | Query and provider observability | M | Faster incident response | Latency/error telemetry | Logging/metrics platform |
| P2 | Normalize migration sequencing safely | M | Clearer schema history | Deterministic unique ordinals | Historical filename aliases |
| P2 | Browser E2E critical journeys | L | Release confidence | Covers framework/integration gaps | Test environment |
| P3 | Enforced layer/import rules | M | Maintainable growth | Prevents architectural erosion | ESLint boundaries |
| P3 | Self-host production fonts | S | Reproducible builds | Removes network dependency | Font assets/licenses |

## Domain Roadmaps

- WhatsApp: signature validation, idempotency, retry/dead-letter visibility, provider health dashboards.
- Database: migration CI, query budgets, indexes from production evidence, backup/restore rehearsal.
- Testing: coverage reporting, E2E identity isolation, webhook contract fixtures, migration-from-zero test.
- Developer experience: CI, CODEOWNERS, generated EKB checks, local bootstrap command.
- Scalability: bounded cron batches, queue-backed delivery, connection-pool sizing, tenant-aware observability.
