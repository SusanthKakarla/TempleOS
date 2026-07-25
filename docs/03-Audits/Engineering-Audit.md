# Engineering Audit

## Architecture Audit

The monolith has clear presentation, boundary, domain, repository, and infrastructure groupings. Primary governance need: codify import boundaries in lint rules rather than relying only on convention.

## Security Audit

- P0: WhatsApp webhook POST signature validation was not statically detected; validate `X-Hub-Signature-256` using the app secret before side effects.
- P1: external PostgreSQL connections use `rejectUnauthorized: false`; configure certificate verification for production.
- P1: add explicit rate limiting to authentication, upload, import, and externally reachable mutation routes.
- Strength: tenant and super-admin sessions are separated and tenant membership is revalidated.

## Performance Audit

- Add query timing/slow-query telemetry and confirm pagination on every list/export boundary.
- Keep cron work bounded and resumable; avoid sequential provider calls at unbounded tenant scale.
- Self-host fonts to remove build-time Google Fonts availability risk.

## Dependency and Configuration Audit

- Lockfile is present and versions are centrally declared.
- No CI workflow was detected; enforce lint, typecheck, tests, build, and migration validation on pull requests.
- Centralize environment validation at startup to fail fast with actionable errors.

## Technical Debt and Dead-Code Audit

- Duplicate migration numeric prefixes reduce historical clarity; do not delete or rename applied migrations without filename compatibility.
- Retired `/api/admins` routes intentionally return 410 and should remain until consumers are confirmed migrated.
- Files with no static dependents are flagged in their records; framework entry points and scripts are not dead solely for that reason.

## Database and Repository Audit

- Repository-per-domain organization is strong and SQL is predominantly parameterized.
- Add automated tenant-scope assertions and migration ordering/clean-database tests.

## API Audit

- Route coverage is broad; authentication patterns are generally centralized.
- Standardize error envelopes, request size limits, idempotency expectations, and rate-limit policy.
