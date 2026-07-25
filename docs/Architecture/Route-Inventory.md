# Route Inventory

68 routes in `app/api/**/route.ts`. Full detail (auth, input shape, DB actions, side effects, validation schema) per route lives in [`ARCHITECTURE_HANDBOOK.md`](../../ARCHITECTURE_HANDBOOK.md) §7 — reproduced here as a flatter, single-purpose reference table. See [Security-Architecture.md](./Security-Architecture.md) for the auth-boundary findings and [Notification-Architecture.md](./Notification-Architecture.md)/[WhatsApp-Architecture.md](./WhatsApp-Architecture.md) for what the "side effects" columns actually trigger downstream.

| Resource | Routes | Auth pattern |
|---|---|---|
| Account | `POST /api/account/locale` | `requireTenantAdminSession` |
| Admins (retired) | `GET/POST /api/admins`, `PATCH/DELETE /api/admins/[id]` | none — all 4 unconditionally return `410 Gone` |
| Audit Log | `GET /api/audit-log` | `requireTenantAdminSession` |
| Auth | `POST/DELETE /api/auth/session`, `GET /api/auth/tenant-context` | Firebase ID token / session cookie / public |
| Cron | `POST /api/cron/{daily-birthday-check,process-event-notifications,process-notifications,sync-whatsapp-templates}` | `isAuthorizedCronRequest` (bearer `CRON_SECRET`) |
| Devotees | 15 routes under `/api/devotees/**` (CRUD, families, import preview/commit/template, export) | `requireTenantAdminSession` + `requireTenantFeatureApi("devotees")` on list/create |
| Donations | 6 routes under `/api/donations/**` (CRUD, export) | `requireTenantAdminSession` + `requireTenantFeatureApi("donations")` on list/create |
| Events | 7 routes under `/api/events/**` (CRUD, announce, export) | `requireTenantAdminSession` + `requireTenantFeatureApi("events")` on list/create |
| Media | 2 routes under `/api/media/**` | `requireTenantAdminSession` |
| Notification Media | 3 routes under `/api/notification-media/**` (festival greeting send, link/unlink) | `requireTenantAdminSession` |
| Notification Preferences | `GET/PUT /api/notification-preferences` | `requireTenantAdminSession` |
| Super Admin | 15 routes under `/api/super-admin/**` (admins, auth, me, roles, temples CRUD, features, member roles, status, whatsapp manual connect) | `requireSuperAdmin` (session auth routes excepted) |
| Temple content (FAQs/Sevas/Social Links/Special Days) | 11 routes | `requireTenantAdminSession` — **no GET/list route on any of the 4** (list views are fetched server-side directly in the Chatbot Settings RSC page) |
| Tenant | `PATCH /api/tenant` | `requireTenantAdminSession` |
| Users | 12 routes under `/api/users/**` (CRUD, roles, status, activity, import, export) | `requireTenantAdminSession` + `requireTenantFeatureApi("user_management")` on list |
| WhatsApp | 13 routes under `/api/whatsapp/**` (connect start/callback, disconnect, onboarding complete, templates CRUD/sync/test-send/**setup** (new), webhook) | `requireTenantAdminSession` except: login endpoints, handoff-token-gated onboarding-complete, and the **unauthenticated** webhook POST (flagged — see [Security-Architecture.md](./Security-Architecture.md)) |

## Notable route-level findings (from the handbook's route audit, still current)

1. **`POST /api/whatsapp/webhook` has no signature verification** — highest-priority finding, see [Security-Architecture.md](./Security-Architecture.md).
2. **`/api/admins` and `/api/admins/[id]`** are pure 410 tombstones — dead weight, safe to delete (see [Dead-Code-Audit.md](./Dead-Code-Audit.md)).
3. **`/api/whatsapp/onboarding/complete`** is the one deliberate non-session-guarded route — it authenticates via a signed handoff token instead, because it runs on a fixed domain that never carries the tenant cookie.
4. **`temple-faqs`/`temple-sevas`/`temple-special-days`** export no GET — unreachable from any non-RSC API consumer without adding one.
5. **`/api/super-admin/roles`** mutation methods are hard-blocked (`405 CUSTOM_ROLES_DEFERRED`) — confirms custom tenant-local roles are a pre-wired, unshipped feature.
6. **Export endpoints consistently pair GET (all/filtered) with POST (`{format, ids[]}` for "selected")** across devotees/donations/events/users — large ID arrays don't fit a query string reliably.
7. **`/api/events/[id]/announce`** is the one route that `await`s WhatsApp delivery synchronously (so the UI can show a real sent/failed count) — every other mutation route dispatches via `after()` and returns immediately.
8. **New this session**: `POST /api/whatsapp/templates/setup` (bulk bootstrap + sync orchestration) — not yet present in the root handbook, added by the WhatsApp Phase 2 work. Full behavior in [WhatsApp-Architecture.md](./WhatsApp-Architecture.md).
