# Folder Architecture

> See [Project-Tree.md](./Project-Tree.md) for the raw tree. This document is the *classification* layer on top of it — what kind of thing lives where, and why.

## Top-level folders and their role

| Folder | Role | Notes |
|---|---|---|
| `app/` | Next.js App Router — pages, layouts, API routes | All 27 `page.tsx` files are Server Components (repo-wide check for `"use client"` at the top of a page found zero matches) |
| `features/` | Domain UI components, one subfolder per business domain | Mix of Server/Client; forms, tables, dialogs, wizards |
| `components/` | Shared, presentational-only UI | `ui/` = 29 shadcn/base-ui primitives; the rest are hand-built shared widgets (table shell, mobile list view, pagination, empty state, page header) |
| `lib/` | All business logic and data access | No ORM — `lib/db/*` is hand-written parameterized SQL over a shared `pg.Pool` |
| `hooks/` | Shared React hooks | Only 4 files — most component-local state stays in the component |
| `types/` | Shared domain types | Single `db.ts` file — no separate types-per-domain split |
| `migrations/` | Chronological `.sql` migration files | Run manually via `scripts/migrate.mts`, not automatic on deploy — see [Database-Architecture.md](./Database-Architecture.md) |
| `scripts/` | One-off / operational CLI scripts | `migrate.mts`, `seed.mts`, `seed-super-admin.{mts,mjs}`, `provision-temple.mts`, `clear-person-firebase-uid.mts` |
| `i18n/` | next-intl request config | Cookie-based locale, not URL-prefixed |
| `locales/en/`, `locales/te/` | Message catalogs | One monolithic `dashboard.json` per locale |

## File Classification (reused from `ARCHITECTURE_HANDBOOK.md` §12 — the enum used throughout the [per-file Audit](./Audit/README.md))

| Category | Representative paths |
|---|---|
| Core Infrastructure | `lib/db/pool.ts`, `lib/db/query-client.ts`, `lib/auth/session-token.ts`, `i18n/*`, `next.config.ts`, `middleware.ts` (absent) |
| Auth | `lib/auth/*`, `require-dashboard-admin.ts`, `require-super-admin.ts`, `lib/firebase/*`, `lib/cron/auth.ts`, `features/auth/*` |
| Database / Repository | `lib/db/*.ts` (35 files) |
| UI — Pages | `app/**/page.tsx` (27), the two shell layouts |
| UI — Feature Components | `features/**` (78) |
| UI — Shared Primitives | `components/ui/*` (29), `components/*` shared widgets |
| Business Logic | `lib/provisioning/*`, `lib/export/*`, `lib/media/*`, `lib/events/*`, `lib/validation/*` |
| API | `app/api/**/route.ts` (68) — see [Route-Inventory.md](./Route-Inventory.md) |
| Notification Engine | `lib/notifications/*`, `lib/db/notifications.ts`, `lib/db/notification-templates.ts`, `lib/db/notification-preferences.ts`, `lib/db/notification-media.ts` |
| WhatsApp | `lib/whatsapp/*`, `lib/db/whatsapp-*.ts`, `app/api/whatsapp/**` |
| Cron | `app/api/cron/**`, `lib/cron/*` |
| Worker / Queue | *(none — cron routes fill this role, see [Caching-Architecture.md](./Caching-Architecture.md) / [Performance-Architecture.md](./Performance-Architecture.md))* |
| Utility | `lib/db/unique-violation.ts`, `lib/i18n/*`, small `*-helpers.ts` files |
| Configuration | `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `components.json`, `.env.example` |
| Testing | 71 `*.test.ts`/`*.test.tsx`, colocated with source |
| Legacy (superseded, still running) | `lib/whatsapp/event-notifications.ts`, `lib/db/event-notifications.ts`, `event_notifications` table, `app/api/cron/process-event-notifications/route.ts` |
| Legacy (retired, inert) | `app/api/admins/**`, `app/(dashboard)/dashboard/admins/page.tsx`, migrations `002`/`003` |
| AI Tooling Scaffolding (not app code) | `.agents/skills/bmad-*/`, `.claude/skills/bmad-*/`, `_bmad/`, `_bmad-output/` |

## Naming traps worth knowing about

- **Two components both named `NotificationPreferencesForm`** — one in `features/chatbot-settings/` (tenant-wide toggles), one in `features/notifications/` (per-person channel prefs). Same name, different data shape and callers — an IDE "jump to definition" trap. See [Refactoring-Opportunities.md](./Refactoring-Opportunities.md#11).
- **Two unrelated "template" concepts** — `notification_templates` (free-form message copy) vs. `whatsapp_message_templates` (Meta-approved HSM templates). Confirmed genuinely distinct, not accidental duplication. See [WhatsApp-Architecture.md](./WhatsApp-Architecture.md).
