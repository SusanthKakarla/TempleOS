# Folder: app/api/super-admin

## Purpose

The `app/api/super-admin/` folder belongs primarily to the **app** area and groups 1 direct documented files.

## Responsibilities and Business Module

- Encapsulate Super Admin behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`auth-boundary.test.ts`](../../../files/app/api/super-admin/auth-boundary.test.ts.md)

## Child Folders

- `app/api/super-admin/admins/`
- `app/api/super-admin/me/`
- `app/api/super-admin/roles/`
- `app/api/super-admin/temples/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
