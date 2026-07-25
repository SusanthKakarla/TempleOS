# Environment Variables

*(New document — not present in the root handbook. Built from a direct repo-wide `process.env.` grep, cross-checked against `.env.example`.)*

## Every environment variable actually read by the code

| Variable | Required/Optional | Read in | Breaks if missing |
|---|---|---|---|
| `DATABASE_URL` | **Required** | `lib/db/pool.ts` | Every DB-backed request fails immediately |
| `SESSION_SECRET` | **Required** | `lib/auth/session-token.ts` | No session cookie can be signed/verified — all login broken |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | Required for auth | `lib/firebase/admin.ts` | Server-side Firebase ID token verification fails — no tenant or super-admin login works |
| `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Required for auth | `lib/firebase/client.ts` | Browser-side phone-OTP flow can't initialize |
| `TEMPLEOS_LOCAL_TENANT_HOST` | Optional, dev-only | `lib/auth/tenant-host.ts` | No effect in production — explicitly ignored there; without it, local dev tenant login needs a real hostname |
| `WHATSAPP_VERIFY_TOKEN` | Required for WhatsApp | `app/api/whatsapp/webhook/route.ts` | Meta's webhook subscription handshake (`GET`) fails |
| `WHATSAPP_ACCESS_TOKEN` | Required for WhatsApp | `lib/whatsapp/embedded-signup.ts`, `lib/whatsapp/client.ts`, `lib/whatsapp/template-sync.ts` | Every Graph API call fails — the shared Tech Provider System User token, see [WhatsApp-Architecture.md](./WhatsApp-Architecture.md) |
| `NEXT_PUBLIC_WHATSAPP_APP_ID` | Required for WhatsApp connect | `lib/whatsapp/embedded-signup.ts`, `features/whatsapp-onboarding/whatsapp-onboarding-flow.tsx` | Embedded Signup JS SDK can't initialize |
| `NEXT_PUBLIC_WHATSAPP_CONFIG_ID` | Required for WhatsApp connect | `features/whatsapp-onboarding/whatsapp-onboarding-flow.tsx` | Embedded Signup flow can't start |
| `WHATSAPP_APP_SECRET` | Required for WhatsApp connect | `lib/whatsapp/embedded-signup.ts` | Code-for-token exchange during Embedded Signup fails |
| `WHATSAPP_ONBOARDING_ORIGIN` | Required for WhatsApp connect | `app/api/whatsapp/connect/start/route.ts` | Handoff token can't be minted with a valid redirect target |
| `CRON_SECRET` | **Required** for background delivery | `lib/cron/auth.ts` | All 4 cron routes reject every request with 401 — notifications never get drained (see [Cron-Architecture.md](./Cron-Architecture.md)) |
| `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_URL_ENDPOINT` | Required for media | `lib/media/imagekit.ts` | Event banner / greeting / festival media uploads fail |
| `NODE_ENV` | Set by the runtime | `app/layout.tsx`, `lib/i18n/locale.ts`, `lib/firebase/errors.ts`, `lib/auth/tenant-host.ts`, `lib/auth/session.ts`, `lib/auth/super-admin-session.ts` | Standard Next.js env — controls cookie `secure` flag, dev-only host override, dev-log verbosity |

## Env vars used only by CLI scripts (not the running app)

| Variable | Read in |
|---|---|
| `SUPER_ADMIN_PHONE_NUMBER`, `SUPER_ADMIN_DISPLAY_NAME` | `scripts/seed.mts`, `scripts/seed-super-admin.{mts,mjs}`, `scripts/provision-temple.mts` (as CLI-flag fallbacks) |
| `WHATSAPP_PHONE_NUMBER`, `META_PHONE_NUMBER_ID`, `META_BUSINESS_ACCOUNT_ID` | Read as CLI fallback defaults by `scripts/provision-temple.mts` per `.env.example`'s own comment — not read anywhere in the running app itself (per-tenant WhatsApp connections live in the `whatsapp_accounts` table, not env vars) |

## Confirmed drift between `.env.example` and actual code

1. **Wrong variable names**: `.env.example` (lines 52-53) declares `ADMIN_PHONE_NUMBER=` / `ADMIN_DISPLAY_NAME=`. A repo-wide grep confirms **zero** code paths read those exact names — every script that bootstraps the first Super Admin reads `SUPER_ADMIN_PHONE_NUMBER` / `SUPER_ADMIN_DISPLAY_NAME` instead. Anyone following `.env.example` literally would set a variable the code never looks at, and the seed would silently skip with "not set" (see `scripts/seed.mts:27`'s own warning message, which correctly names the real variable).
2. **A documented cron route that doesn't exist**: `.env.example`'s comment block (lines 60-67) tells the reader to configure an hourly `/api/cron/event-reminders` Railway schedule. No such route exists — `find app/api/cron` shows only `daily-birthday-check`, `process-event-notifications`, `process-notifications`, and (new this session) `sync-whatsapp-templates`. Event reminders are actually sent as part of `daily-birthday-check`'s daily run (it also computes "events starting tomorrow"), not a separate hourly route.
3. **Missing entirely**: `.env.example` does not mention `sync-whatsapp-templates` at all, or that it needs its own Railway schedule (see [WhatsApp-Architecture.md](./WhatsApp-Architecture.md)/[Cron-Architecture.md](./Cron-Architecture.md)) — added this session, after `.env.example` was last touched.

**Recommendation**: fix `.env.example`'s two wrong/stale entries and add the missing cron-route note — a pure documentation fix, zero behavior change. See [Refactoring-Opportunities.md](./Refactoring-Opportunities.md).

## Cross-references

[Deployment-Architecture.md](./Deployment-Architecture.md) · [Configuration-Audit.md](./Configuration-Audit.md) · [Cron-Architecture.md](./Cron-Architecture.md)
