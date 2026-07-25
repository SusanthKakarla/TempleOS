# Folder: app

## Purpose

The `app/` folder belongs primarily to the **app** area and groups 5 direct documented files.

## Responsibilities and Business Module

- Encapsulate App behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`forbidden-sign-out-button.tsx`](../files/app/forbidden-sign-out-button.tsx.md)
- [`forbidden.tsx`](../files/app/forbidden.tsx.md)
- [`globals.css`](../files/app/globals.css.md)
- [`layout.tsx`](../files/app/layout.tsx.md)
- [`page.tsx`](../files/app/page.tsx.md)

## Child Folders

- `app/(dashboard)/`
- `app/(marketing)/`
- `app/api/`
- `app/whatsapp-onboarding/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
