# Folder: features/auth

## Purpose

The `features/auth/` folder belongs primarily to the **Auth** area and groups 2 direct documented files.

## Responsibilities and Business Module

- Encapsulate Auth behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`country-code-select.tsx`](../../files/features/auth/country-code-select.tsx.md)
- [`tenant-login-form.tsx`](../../files/features/auth/tenant-login-form.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
