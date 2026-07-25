# Folder: lib/whatsapp/locales

## Purpose

The `lib/whatsapp/locales/` folder belongs primarily to the **WhatsApp** area and groups 3 direct documented files.

## Responsibilities and Business Module

- Encapsulate Locales behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`en.ts`](../../../files/lib/whatsapp/locales/en.ts.md)
- [`te.ts`](../../../files/lib/whatsapp/locales/te.ts.md)
- [`types.ts`](../../../files/lib/whatsapp/locales/types.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
