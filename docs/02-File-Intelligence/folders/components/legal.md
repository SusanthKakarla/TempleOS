# Folder: components/legal

## Purpose

The `components/legal/` folder belongs primarily to the **Presentation** area and groups 3 direct documented files.

## Responsibilities and Business Module

- Encapsulate Legal behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`legal-hero.tsx`](../../files/components/legal/legal-hero.tsx.md)
- [`legal-section.tsx`](../../files/components/legal/legal-section.tsx.md)
- [`table-of-contents.tsx`](../../files/components/legal/table-of-contents.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
