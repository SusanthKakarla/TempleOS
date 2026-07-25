# Folder: app/(dashboard)/dashboard/users

## Purpose

The `app/(dashboard)/dashboard/users/` folder belongs primarily to the **app** area and groups 2 direct documented files.

## Responsibilities and Business Module

- Encapsulate Users behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`loading.tsx`](../../../../files/app/%28dashboard%29/dashboard/users/loading.tsx.md)
- [`page.tsx`](../../../../files/app/%28dashboard%29/dashboard/users/page.tsx.md)

## Child Folders

- `app/(dashboard)/dashboard/users/activity/`
- `app/(dashboard)/dashboard/users/import/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
