# Folder: lib/export/columns

## Purpose

The `lib/export/columns/` folder belongs primarily to the **Export** area and groups 10 direct documented files.

## Responsibilities and Business Module

- Encapsulate Columns behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`campaigns.ts`](../../../files/lib/export/columns/campaigns.ts.md)
- [`devotees.test.ts`](../../../files/lib/export/columns/devotees.test.ts.md)
- [`devotees.ts`](../../../files/lib/export/columns/devotees.ts.md)
- [`donations.test.ts`](../../../files/lib/export/columns/donations.test.ts.md)
- [`donations.ts`](../../../files/lib/export/columns/donations.ts.md)
- [`events.test.ts`](../../../files/lib/export/columns/events.test.ts.md)
- [`events.ts`](../../../files/lib/export/columns/events.ts.md)
- [`users.ts`](../../../files/lib/export/columns/users.ts.md)
- [`whatsapp-thread.test.ts`](../../../files/lib/export/columns/whatsapp-thread.test.ts.md)
- [`whatsapp-thread.ts`](../../../files/lib/export/columns/whatsapp-thread.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
