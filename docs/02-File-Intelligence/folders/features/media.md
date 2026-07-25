# Folder: features/media

## Purpose

The `features/media/` folder belongs primarily to the **Media** area and groups 3 direct documented files.

## Responsibilities and Business Module

- Encapsulate Media behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`festival-media-grid.tsx`](../../files/features/media/festival-media-grid.tsx.md)
- [`greeting-media-card.tsx`](../../files/features/media/greeting-media-card.tsx.md)
- [`media-upload.tsx`](../../files/features/media/media-upload.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
