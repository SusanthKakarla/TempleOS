# UI Architecture

> Source: [`ARCHITECTURE_HANDBOOK.md`](../../ARCHITECTURE_HANDBOOK.md) §10-11.

## Pages (27 routes, all Server Components)

A repo-wide check for `"use client"` at the top of any `page.tsx` found zero real matches — every page is a Server Component that fetches its own data directly (no client-side data fetching layer, no React Query/SWR).

| Area | Routes | Guard |
|---|---|---|
| Public | `/`, `/login`, `/access-denied`, `/privacy-policy`, `/terms-of-service`, `/whatsapp-onboarding` | none or handoff-token |
| Tenant dashboard | `/dashboard`, `/dashboard/{admins,chatbot-settings,devotees,devotees/[id],devotees/family/new,devotees/family/[familyId]/edit,devotees/import,donations,events,notification-preferences,users,users/activity,users/import}` | `requireDashboardAdmin` (+ per-feature gate) |
| Super Admin | `/super-admin/login`, `/super-admin`, `/super-admin/{admins,roles,temples,temples/new,temples/[tenantId]}` | `requireSuperAdminPage` |

Full per-page data-fetch and component list is in the handbook §10 — reproduced per-file in the [Audit](./Audit/README.md) directory (Phase 2, Batch 9) rather than duplicated here.

## Feature components (78 files across 11 domains)

Unused-component check (handbook §11, re-verified): every exported component/hook traces to at least one consumer — **no orphaned feature components found**.

| Domain | Files | Notable |
|---|---|---|
| `features/auth` | 2 | Login form, country-code select |
| `features/chatbot-settings` | 17 | Largest domain; includes the new `whatsapp-template-setup-wizard.tsx` (this session) and `whatsapp-templates-tab.tsx` (442 lines, largest in folder) |
| `features/dashboard` | 10 | Sidebar, bottom nav, topbar, ambient background, metric card, donations chart |
| `features/devotees` | 4 | `devotees-table.tsx` (608 lines, largest in the whole `features/` tree) |
| `features/donations` | 4 | Shared `donation-form-dialog.tsx` reused by both the ledger and the devotee detail card |
| `features/events` | 6 | `event-card.tsx`, `events-table.tsx` — note the `formatEventTime` duplication between them, see [Refactoring-Opportunities.md](./Refactoring-Opportunities.md) |
| `features/export` | 1 | `export-menu.tsx` — genuinely shared across devotees/donations/events/users |
| `features/media` | 3 | Shared single-image upload primitive underlying festival/greeting cards and the event banner uploader |
| `features/notifications` | 3 | Includes the second `NotificationPreferencesForm` (naming trap, see [Folder-Architecture.md](./Folder-Architecture.md)) |
| `features/super-admin` | 21 | `new-temple-form.tsx` (581 lines, largest in folder) |
| `features/users` | 9 | `users-table.tsx` (502 lines) hosts all 6 user dialogs |
| `features/whatsapp-onboarding` | 1 | Drives the Meta Embedded Signup JS SDK popup |

## Shared primitives (`components/`)

29 shadcn/base-ui primitives in `components/ui/*` (button, dialog, table, sheet, sidebar, etc. — `sidebar.tsx` alone is 735 lines, largely boilerplate). Hand-built shared widgets: `table-shell.tsx`, `mobile-list-view.tsx`/`mobile-list-row.tsx` (the `hidden md:block` / `md:hidden` responsive-split pattern used across every domain's list view), `pagination-controls.tsx`, `empty-state.tsx`, `page-header.tsx`, `responsive-search-bar.tsx`, `sticky-toolbar.tsx`.

## Cross-references

[Testing-Architecture.md](./Testing-Architecture.md) · [Performance-Architecture.md](./Performance-Architecture.md) for the largest-files table · [Audit/features/](./Audit/) and [Audit/app/](./Audit/) (Phase 2, Batches 7-9).
