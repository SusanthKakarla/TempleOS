# Folder: features/campaigns

## Purpose

The `features/campaigns/` folder belongs primarily to the **Campaigns** area and groups 3 direct documented files.

## Responsibilities and Business Module

- Encapsulate Campaigns behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`campaign-detail.tsx`](../../files/features/campaigns/campaign-detail.tsx.md)
- [`campaign-form-dialog.tsx`](../../files/features/campaigns/campaign-form-dialog.tsx.md)
- [`campaigns-table.tsx`](../../files/features/campaigns/campaigns-table.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
