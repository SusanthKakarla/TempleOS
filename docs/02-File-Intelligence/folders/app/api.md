# Folder: app/api

## Purpose

The `app/api/` folder belongs primarily to the **app** area and groups 2 direct documented files.

## Responsibilities and Business Module

- Encapsulate Api behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`identity-session-isolation.test.ts`](../../files/app/api/identity-session-isolation.test.ts.md)
- [`tenant-dashboard-auth-boundary.test.ts`](../../files/app/api/tenant-dashboard-auth-boundary.test.ts.md)

## Child Folders

- `app/api/admins/`
- `app/api/audit-log/`
- `app/api/auth/`
- `app/api/campaigns/`
- `app/api/devotees/`
- `app/api/donations/`
- `app/api/events/`
- `app/api/notification-preferences/`
- `app/api/super-admin/`
- `app/api/temple-faqs/`
- `app/api/temple-sevas/`
- `app/api/temple-special-days/`
- `app/api/tenant/`
- `app/api/users/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
