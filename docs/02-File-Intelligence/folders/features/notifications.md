# Folder: features/notifications

## Purpose

The `features/notifications/` folder belongs primarily to the **Notifications** area and groups 3 direct documented files.

## Responsibilities and Business Module

- Encapsulate Notifications behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`automated-notification-list.tsx`](../../files/features/notifications/automated-notification-list.tsx.md)
- [`notification-detail-drawer.tsx`](../../files/features/notifications/notification-detail-drawer.tsx.md)
- [`notification-preferences-form.tsx`](../../files/features/notifications/notification-preferences-form.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
