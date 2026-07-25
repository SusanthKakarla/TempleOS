# Folder: app/api/whatsapp/templates

## Purpose

The `app/api/whatsapp/templates/` folder belongs primarily to the **app** area and groups 1 direct documented files.

## Responsibilities and Business Module

- Encapsulate Templates behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`route.ts`](../../../../files/app/api/whatsapp/templates/route.ts.md)

## Child Folders

- `app/api/whatsapp/templates/[id]/`
- `app/api/whatsapp/templates/setup/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
