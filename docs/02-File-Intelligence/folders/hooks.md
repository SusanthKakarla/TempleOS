# Folder: hooks

## Purpose

The `hooks/` folder belongs primarily to the **Shared** area and groups 4 direct documented files.

## Responsibilities and Business Module

- Encapsulate Hooks behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`use-debounced-search-param.ts`](../files/hooks/use-debounced-search-param.ts.md)
- [`use-long-press.ts`](../files/hooks/use-long-press.ts.md)
- [`use-mobile.ts`](../files/hooks/use-mobile.ts.md)
- [`use-ripple.ts`](../files/hooks/use-ripple.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
