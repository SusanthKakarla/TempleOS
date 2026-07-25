# Folder: locales/en

## Purpose

The `locales/en/` folder belongs primarily to the **Internationalization** area and groups 1 direct documented files.

## Responsibilities and Business Module

- Encapsulate En behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`dashboard.json`](../../files/locales/en/dashboard.json.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
