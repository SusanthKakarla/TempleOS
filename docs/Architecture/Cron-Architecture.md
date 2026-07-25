# Cron Architecture

TempleOS has no long-running worker process, queue broker, or job scheduler library (no BullMQ/Redis/etc.). All "background" work is **cron-triggered HTTP endpoints**, invoked by Railway's cron scheduler hitting a public URL with a bearer-token secret, plus fire-and-forget work dispatched from within a request via Next.js's `after()`.

## The 4 cron routes (`app/api/cron/*`, guarded by `isAuthorizedCronRequest`)

| Route | Purpose | What it does |
|---|---|---|
| `POST /api/cron/daily-birthday-check` | Daily digest of date-driven notifications | Iterates every active tenant in its own timezone, enqueues devotee/priest birthdays & anniversaries, family-occasion reminders due tomorrow, event reminders for events starting tomorrow — then calls `processNotifications()`. |
| `POST /api/cron/process-notifications` | Generic Notification Engine's retry/delivery tick | Pulls due rows (`listDueNotifications`) and runs `sendNotification()` → `logDeliveryOutcome()` per row. This is what actually drains the queue every `enqueueNotification()` call anywhere in the app writes into. |
| `POST /api/cron/process-event-notifications` | **Legacy** event-notification pipeline's delivery tick | Pulls from the separate `event_notifications` table, sends directly — does **not** go through the Delivery Strategy layer (no 24h-window fallback, no template support). |
| `POST /api/cron/sync-whatsapp-templates` | **New this session** — continuous template approval sync | Loops `listConnectedWhatsAppAccounts()` → `listPendingTemplatesForTenant()` → `syncTemplateApprovalStatus` + auto-enable, per tenant, catching per-item errors. Not yet scheduled in Railway's dashboard (code-only; scheduling is a manual follow-up outside this codebase). |

All four are stateless HTTP handlers — "the queue" is Postgres rows with a status column, "the worker" is Railway re-invoking the route on a schedule. Idempotency relies on each row's status transition happening inside the same request that reads it, not a distributed lock — safe only as long as Railway doesn't invoke overlapping instances of the same route concurrently (no protection against that today — see [Performance-Architecture.md](./Performance-Architecture.md)).

## Fire-and-forget in-request work (`after()`)

Most mutation routes that trigger a WhatsApp send (devotee created, donation recorded, event published, user invited, tenant status/feature changed, festival greeting) call `enqueueNotification()` synchronously, then dispatch `processNotifications()` via `after()` so the HTTP response returns before the Graph API round-trip completes. The one exception: `POST /api/events/[id]/announce` `await`s delivery synchronously so the "Announce" button can report a real sent/failed count.

## The webhook is not "background"

`POST /api/whatsapp/webhook` runs entirely within the HTTP request Meta itself makes — not cron-triggered, no queue. Inbound chatbot replies are computed and sent back synchronously inside that same request.

## Cross-references

[WhatsApp-Architecture.md](./WhatsApp-Architecture.md) for what the sync cron actually calls · [Notification-Architecture.md](./Notification-Architecture.md) for the engine these crons drain · [Deployment-Architecture.md](./Deployment-Architecture.md) for how Railway schedules these · [Audit/lib/cron/](./Audit/) and [Audit/app/api/cron/](./Audit/) for per-file audits (Phase 2, Batches 1 & 3).
