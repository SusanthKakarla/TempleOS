# Folder: features/super-admin

## Purpose

The `features/super-admin/` folder belongs primarily to the **Super Admin** area and groups 21 direct documented files.

## Responsibilities and Business Module

- Encapsulate Super Admin behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`add-super-admin-dialog.tsx`](../../files/features/super-admin/add-super-admin-dialog.tsx.md)
- [`admins-list.tsx`](../../files/features/super-admin/admins-list.tsx.md)
- [`deactivate-super-admin-button.tsx`](../../files/features/super-admin/deactivate-super-admin-button.tsx.md)
- [`member-role-editor-helpers.test.ts`](../../files/features/super-admin/member-role-editor-helpers.test.ts.md)
- [`member-role-editor-helpers.ts`](../../files/features/super-admin/member-role-editor-helpers.ts.md)
- [`member-role-editor.tsx`](../../files/features/super-admin/member-role-editor.tsx.md)
- [`new-temple-form-helpers.test.ts`](../../files/features/super-admin/new-temple-form-helpers.test.ts.md)
- [`new-temple-form-helpers.ts`](../../files/features/super-admin/new-temple-form-helpers.ts.md)
- [`new-temple-form.tsx`](../../files/features/super-admin/new-temple-form.tsx.md)
- [`super-admin-bottom-nav-bar.tsx`](../../files/features/super-admin/super-admin-bottom-nav-bar.tsx.md)
- [`super-admin-login-form.tsx`](../../files/features/super-admin/super-admin-login-form.tsx.md)
- [`super-admin-shell.tsx`](../../files/features/super-admin/super-admin-shell.tsx.md)
- [`super-admin-sidebar.tsx`](../../files/features/super-admin/super-admin-sidebar.tsx.md)
- [`super-admin-topbar.tsx`](../../files/features/super-admin/super-admin-topbar.tsx.md)
- [`temple-detail-edit-form-helpers.test.ts`](../../files/features/super-admin/temple-detail-edit-form-helpers.test.ts.md)
- [`temple-detail-edit-form-helpers.ts`](../../files/features/super-admin/temple-detail-edit-form-helpers.ts.md)
- [`temple-detail-edit-form.tsx`](../../files/features/super-admin/temple-detail-edit-form.tsx.md)
- [`temples-list.tsx`](../../files/features/super-admin/temples-list.tsx.md)
- [`tenant-feature-management-card.tsx`](../../files/features/super-admin/tenant-feature-management-card.tsx.md)
- [`tenant-status-control.tsx`](../../files/features/super-admin/tenant-status-control.tsx.md)
- [`whatsapp-connection-form.tsx`](../../files/features/super-admin/whatsapp-connection-form.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
