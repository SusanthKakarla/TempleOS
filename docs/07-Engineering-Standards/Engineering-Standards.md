# Engineering Standards

## Naming and Folders

- Use kebab-case filenames, PascalCase React components/types, camelCase functions, and explicit domain terminology.
- Pages/routes orchestrate; `features/` owns domain UI; `components/` owns reusable UI; `lib/db/` owns persistence.

## Import and Layer Rules

- Client code must not import database, Firebase Admin, secrets, or Node-only provider modules.
- Repositories must not import presentation code.
- Cross-domain workflows belong in a named service, not a route or component.

## API and Security

- Authenticate and authorize before reading or mutating protected data.
- Derive tenant identity from trusted server context and validate all untrusted input.
- Use stable error codes, bounded payloads, provider signature checks, and rate limits.

## Database

- Parameterize values, scope tenant queries, use transactions for multi-write invariants, and add evidence-based indexes.
- Migrations are forward-only and immutable after deployment; filenames are durable identifiers.

## Testing

- Unit-test domain rules, validation boundaries, tenant isolation, error mapping, and migration helpers.
- Add integration/E2E coverage for critical identity, provisioning, import, notification, and provider flows.

## Git and Review

- Keep commits cohesive; require passing typecheck, lint, tests, and build.
- Pull requests state risk, tenant/security impact, schema changes, verification, rollback, and documentation impact.
- Critical-risk files require security/domain-owner review.
