# Folder: lib/campaigns

## Purpose

The `lib/campaigns/` folder belongs primarily to the **lib** area and groups 5 direct documented files.

## Responsibilities and Business Module

- Encapsulate Campaigns behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`lifecycle.test.ts`](../../files/lib/campaigns/lifecycle.test.ts.md)
- [`lifecycle.ts`](../../files/lib/campaigns/lifecycle.ts.md)
- [`recurrence.test.ts`](../../files/lib/campaigns/recurrence.test.ts.md)
- [`recurrence.ts`](../../files/lib/campaigns/recurrence.ts.md)
- [`run-campaign.ts`](../../files/lib/campaigns/run-campaign.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
