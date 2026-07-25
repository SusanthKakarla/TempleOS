# Folder: features/users

## Purpose

The `features/users/` folder belongs primarily to the **Users** area and groups 9 direct documented files.

## Responsibilities and Business Module

- Encapsulate Users behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`activity-log-table.tsx`](../../files/features/users/activity-log-table.tsx.md)
- [`change-role-dialog.tsx`](../../files/features/users/change-role-dialog.tsx.md)
- [`delete-user-dialog.tsx`](../../files/features/users/delete-user-dialog.tsx.md)
- [`edit-user-dialog.tsx`](../../files/features/users/edit-user-dialog.tsx.md)
- [`invite-user-dialog.tsx`](../../files/features/users/invite-user-dialog.tsx.md)
- [`toggle-user-status-dialog.tsx`](../../files/features/users/toggle-user-status-dialog.tsx.md)
- [`user-activity-panel.tsx`](../../files/features/users/user-activity-panel.tsx.md)
- [`user-import-wizard.tsx`](../../files/features/users/user-import-wizard.tsx.md)
- [`users-table.tsx`](../../files/features/users/users-table.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
