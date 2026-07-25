# Folder: scripts

## Purpose

The `scripts/` folder belongs primarily to the **Operations** area and groups 10 direct documented files.

## Responsibilities and Business Module

- Encapsulate Scripts behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`clear-person-firebase-uid.mts`](../files/scripts/clear-person-firebase-uid.mts.md)
- [`generate-ekb.mjs`](../files/scripts/generate-ekb.mjs.md)
- [`load-env.mts`](../files/scripts/load-env.mts.md)
- [`migrate.mts`](../files/scripts/migrate.mts.md)
- [`provision-temple.mts`](../files/scripts/provision-temple.mts.md)
- [`provision-temple.test.ts`](../files/scripts/provision-temple.test.ts.md)
- [`seed-bootstrap.test.ts`](../files/scripts/seed-bootstrap.test.ts.md)
- [`seed-super-admin.mjs`](../files/scripts/seed-super-admin.mjs.md)
- [`seed-super-admin.mts`](../files/scripts/seed-super-admin.mts.md)
- [`seed.mts`](../files/scripts/seed.mts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
