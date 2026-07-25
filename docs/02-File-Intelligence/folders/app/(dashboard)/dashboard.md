# Folder: app/(dashboard)/dashboard

## Purpose

The `app/(dashboard)/dashboard/` folder belongs primarily to the **app** area and groups 3 direct documented files.

## Responsibilities and Business Module

- Encapsulate Dashboard behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`loading.tsx`](../../../files/app/%28dashboard%29/dashboard/loading.tsx.md)
- [`page.tsx`](../../../files/app/%28dashboard%29/dashboard/page.tsx.md)
- [`require-dashboard-admin.ts`](../../../files/app/%28dashboard%29/dashboard/require-dashboard-admin.ts.md)

## Child Folders

- `app/(dashboard)/dashboard/admins/`
- `app/(dashboard)/dashboard/campaigns/`
- `app/(dashboard)/dashboard/chatbot-settings/`
- `app/(dashboard)/dashboard/devotees/`
- `app/(dashboard)/dashboard/donations/`
- `app/(dashboard)/dashboard/events/`
- `app/(dashboard)/dashboard/notification-preferences/`
- `app/(dashboard)/dashboard/users/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
