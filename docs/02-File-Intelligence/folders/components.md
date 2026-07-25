# Folder: components

## Purpose

The `components/` folder belongs primarily to the **Presentation** area and groups 17 direct documented files.

## Responsibilities and Business Module

- Encapsulate Components behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`empty-state.tsx`](../files/components/empty-state.tsx.md)
- [`fade-in.tsx`](../files/components/fade-in.tsx.md)
- [`filter-bottom-sheet.tsx`](../files/components/filter-bottom-sheet.tsx.md)
- [`floating-action-button.tsx`](../files/components/floating-action-button.tsx.md)
- [`mobile-list-row.tsx`](../files/components/mobile-list-row.tsx.md)
- [`mobile-list-view.tsx`](../files/components/mobile-list-view.tsx.md)
- [`overflow-action-menu.tsx`](../files/components/overflow-action-menu.tsx.md)
- [`page-header.tsx`](../files/components/page-header.tsx.md)
- [`pagination-controls.tsx`](../files/components/pagination-controls.tsx.md)
- [`responsive-search-bar.tsx`](../files/components/responsive-search-bar.tsx.md)
- [`site-footer.tsx`](../files/components/site-footer.tsx.md)
- [`site-header.tsx`](../files/components/site-header.tsx.md)
- [`sortable-table-head.tsx`](../files/components/sortable-table-head.tsx.md)
- [`sticky-toolbar.tsx`](../files/components/sticky-toolbar.tsx.md)
- [`table-shell.tsx`](../files/components/table-shell.tsx.md)
- [`table-skeleton.tsx`](../files/components/table-skeleton.tsx.md)
- [`theme-toggle.tsx`](../files/components/theme-toggle.tsx.md)

## Child Folders

- `components/legal/`
- `components/ui/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
