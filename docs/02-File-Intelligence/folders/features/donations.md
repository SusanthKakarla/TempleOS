# Folder: features/donations

## Purpose

The `features/donations/` folder belongs primarily to the **Donations** area and groups 4 direct documented files.

## Responsibilities and Business Module

- Encapsulate Donations behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`devotee-donations-card.tsx`](../../files/features/donations/devotee-donations-card.tsx.md)
- [`donation-form-dialog.tsx`](../../files/features/donations/donation-form-dialog.tsx.md)
- [`donation-options.ts`](../../files/features/donations/donation-options.ts.md)
- [`donations-table.tsx`](../../files/features/donations/donations-table.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
