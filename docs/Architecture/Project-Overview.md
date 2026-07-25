# Project Overview

> Part of the TempleOS Architecture documentation set. This index page links to all 16 architecture documents plus the cross-cutting audits and the per-file [Audit](./Audit/README.md) directory. The original source document these were built from is [`ARCHITECTURE_HANDBOOK.md`](../../ARCHITECTURE_HANDBOOK.md) at the repo root (1430 lines, produced by static analysis, read-only — no application code was changed to produce either that document or this set).

## What TempleOS is

TempleOS is a multi-tenant SaaS platform that gives individual Hindu temples a dashboard for managing devotees, donations, and events, plus a WhatsApp chatbot/notification channel to reach devotees — all provisioned and overseen by a separate platform-level Super Admin layer. It is a **Next.js 16** App Router application (`app/`) backed directly by PostgreSQL via hand-written SQL in a repository layer (`lib/db/`, no ORM), with Firebase used only for phone-OTP identity verification (not authorization or data storage), and Meta's WhatsApp Cloud API as the sole outbound/inbound messaging channel.

*(Note: the root handbook's Executive Summary says "Next.js 15" — `package.json` currently pins `"next": "16.2.10"`, confirmed directly. Documented here as Next.js 16; likely upgraded after the handbook was written.)*

## Scale (recounted directly, current as of this document)

| Directory | Non-test files | Test files |
|---|---|---|
| `app/` | 115 | 14 |
| `features/` | 78 | 3 |
| `components/` | 49 | 0 |
| `lib/` | 114 | 51 |
| `hooks/` | 4 | 0 |
| `types/` | 1 | 0 |
| `migrations/` | 23 | 1 |
| `scripts/` | 6 | 2 |
| **Total** | **390** | **71** |

68 API routes, 27 pages, 35 database repository files, 22 migrations producing 30 tables, 80 feature components, 29 shared UI primitives.

## Architectural shape, in one paragraph

Three independent identity/session systems (tenant staff, platform Super Admin, and a shared-secret cron caller) with **no central `middleware.ts`** — every page and API route calls its own guard function inline (see [Authentication-Architecture.md](./Authentication-Architecture.md)). A single generic Notification Engine (`notifications` table + `lib/notifications/*`) drives almost all WhatsApp/in-app messaging, extended with a Delivery Strategy layer that falls back to a Meta-approved Message Template when the 24-hour free-form messaging window has closed, and — as of this session — an automatic bootstrap + guided setup wizard + continuous sync cron for that template layer (see [WhatsApp-Architecture.md](./WhatsApp-Architecture.md)). One older, narrower notification pipeline (`event_notifications` table) still runs in parallel, superseded but not yet deleted (see [Dead-Code-Audit.md](./Dead-Code-Audit.md)).

## Headline findings

1. **The inbound WhatsApp webhook accepts unauthenticated POST requests** — no Meta `X-Hub-Signature-256` verification. The single highest-priority finding across the whole audit. See [Security-Architecture.md](./Security-Architecture.md).
2. A handful of stub/legacy routes, one duplicated small helper (`isUniqueViolation`, reimplemented in 9 files instead of imported), and a few oversized files — none catastrophic, all itemized in [Dead-Code-Audit.md](./Dead-Code-Audit.md) and [Refactoring-Opportunities.md](./Refactoring-Opportunities.md).
3. `.env.example` has drifted from the actual code: it declares `ADMIN_PHONE_NUMBER`/`ADMIN_DISPLAY_NAME`, but every script that reads a bootstrap-admin env var actually reads `SUPER_ADMIN_PHONE_NUMBER`/`SUPER_ADMIN_DISPLAY_NAME` (verified via repo-wide grep — zero code paths read the bare `ADMIN_*` names). It also documents a `/api/cron/event-reminders` route that doesn't exist, and doesn't mention the newly-added `/api/cron/sync-whatsapp-templates` route at all. See [Environment-Variables.md](./Environment-Variables.md).
4. No caching layer, no CI config (`.github/` doesn't exist), no dedicated worker/queue — all background work is cron-polling. See [Caching-Architecture.md](./Caching-Architecture.md) and [Deployment-Architecture.md](./Deployment-Architecture.md).

## Document index

| Doc | Covers |
|---|---|
| [Folder-Architecture.md](./Folder-Architecture.md) | Full folder tree + file classification |
| [Layer-Architecture.md](./Layer-Architecture.md) | `app → features → lib/components` layering, circular-dependency check |
| [Request-Lifecycle.md](./Request-Lifecycle.md) | Traced request flows: page load, mutating POST, cron tick, webhook |
| [Database-Architecture.md](./Database-Architecture.md) | Repository layer, migrations, schema, ERD |
| [Authentication-Architecture.md](./Authentication-Architecture.md) | 3 identity systems, session tokens, authorization tiers |
| [Notification-Architecture.md](./Notification-Architecture.md) | Generic Notification Engine + background processes |
| [WhatsApp-Architecture.md](./WhatsApp-Architecture.md) | Delivery Strategy, template system, Phase-2 bootstrap/wizard/sync |
| [Deployment-Architecture.md](./Deployment-Architecture.md) | Railway hosting, build/start, env requirements, no CI |
| [Caching-Architecture.md](./Caching-Architecture.md) | Explicit finding: no caching layer exists |
| [Cron-Architecture.md](./Cron-Architecture.md) | All 4 cron routes |
| [Testing-Architecture.md](./Testing-Architecture.md) | Per-directory test coverage across all 71 test files |
| [UI-Architecture.md](./UI-Architecture.md) | 27 pages + 80 feature components + shared primitives |
| [Performance-Architecture.md](./Performance-Architecture.md) | N+1 queries, largest files, no queue |
| [Security-Architecture.md](./Security-Architecture.md) | Webhook signature gap, SQL injection check, auth-guard coverage |
| [Dependency-Graph.md](./Dependency-Graph.md) | Import layering diagram + most-imported files |
| [Route-Inventory.md](./Route-Inventory.md) | All 68 API routes, one table |
| [Environment-Variables.md](./Environment-Variables.md) | Every `process.env.X`, one row each |
| [Configuration-Audit.md](./Configuration-Audit.md) | `package.json`/`tsconfig`/`eslint`/`vitest`/`next.config` |
| [Dead-Code-Audit.md](./Dead-Code-Audit.md) | Confirmed-dead files, legacy/superseded systems |
| [Refactoring-Opportunities.md](./Refactoring-Opportunities.md) | Ranked recommendations |
| [Project-Tree.md](./Project-Tree.md) | The annotated folder tree as a standalone linkable doc |
| [Audit/README.md](./Audit/README.md) | Per-file audit index/search index + progress tracker (390 files, in progress) |
