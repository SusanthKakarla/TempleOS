# Folder: features/dashboard

## Purpose

The `features/dashboard/` folder belongs primarily to the **Dashboard** area and groups 10 direct documented files.

## Responsibilities and Business Module

- Encapsulate Dashboard behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`ambient-background.tsx`](../../files/features/dashboard/ambient-background.tsx.md)
- [`app-sidebar.tsx`](../../files/features/dashboard/app-sidebar.tsx.md)
- [`bottom-nav-bar.tsx`](../../files/features/dashboard/bottom-nav-bar.tsx.md)
- [`dashboard-shell.tsx`](../../files/features/dashboard/dashboard-shell.tsx.md)
- [`dashboard-topbar.tsx`](../../files/features/dashboard/dashboard-topbar.tsx.md)
- [`donations-chart.tsx`](../../files/features/dashboard/donations-chart.tsx.md)
- [`language-switcher.tsx`](../../files/features/dashboard/language-switcher.tsx.md)
- [`metric-card.tsx`](../../files/features/dashboard/metric-card.tsx.md)
- [`motion-provider.tsx`](../../files/features/dashboard/motion-provider.tsx.md)
- [`use-count-up.ts`](../../files/features/dashboard/use-count-up.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
