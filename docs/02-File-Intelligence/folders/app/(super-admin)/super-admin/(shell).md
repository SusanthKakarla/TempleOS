# Folder: app/(super-admin)/super-admin/(shell)

## Purpose

The `app/(super-admin)/super-admin/(shell)/` folder belongs primarily to the **app** area and groups 2 direct documented files.

## Responsibilities and Business Module

- Encapsulate (Shell) behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`layout.tsx`](../../../../files/app/%28super-admin%29/super-admin/%28shell%29/layout.tsx.md)
- [`page.tsx`](../../../../files/app/%28super-admin%29/super-admin/%28shell%29/page.tsx.md)

## Child Folders

- `app/(super-admin)/super-admin/(shell)/admins/`
- `app/(super-admin)/super-admin/(shell)/roles/`
- `app/(super-admin)/super-admin/(shell)/temples/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
