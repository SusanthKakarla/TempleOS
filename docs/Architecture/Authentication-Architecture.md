# Authentication & Authorization Architecture

> Source: [`ARCHITECTURE_HANDBOOK.md`](../../ARCHITECTURE_HANDBOOK.md) §4, reproduced as a standalone doc — verified still accurate, no changes needed.

## Overview

TempleOS has **no `middleware.ts`** (confirmed absent repo-wide). Every authorization check happens *inline*, per request, inside Server Components (pages) and Route Handlers, by explicitly calling one of three guard functions at the top of the function body. Deliberate, not an oversight — see [Layer-Architecture.md](./Layer-Architecture.md) for the trade-off.

## Three independent identity systems

| System | Cookie | Session payload | Table | Login method |
|---|---|---|---|---|
| Tenant (temple staff) | `templeos_session` | `SessionPayload` (`tenantId, personId, membershipId, roles[], phoneNumber, displayName, exp`) | `persons` + `tenant_memberships` + `tenant_membership_roles` | Firebase phone-OTP, scoped to the temple's own hostname |
| Super Admin (platform staff) | `templeos_super_admin_session` | `SuperAdminSessionPayload` (`superAdminId, phoneNumber, displayName, exp`) | `super_admins` | Firebase phone-OTP, fixed super-admin login route |
| Cron | none | none | none | `Authorization: Bearer $CRON_SECRET`, timing-safe compared |

A person can hold both a tenant session and a super-admin session simultaneously (two different cookies) — the super-admin guards explicitly check for a tenant cookie's presence to distinguish "not logged in at all" (401) from "logged in as tenant staff but not a super admin" (403).

## Session tokens (`lib/auth/session-token.ts`)

Both session systems share one primitive: `createSignedSessionToken` / `verifySignedSessionToken`. A **hand-rolled signed cookie, not a JWT library**: `base64url(JSON.stringify(payload)) + "." + HMAC-SHA256(payload, SESSION_SECRET)`. `timingSafeEqual` for signature comparison; `payload.exp < Date.now()` for expiry. No algorithm-confusion risk (no `alg` field — always HMAC-SHA256 against one server secret). Cookies: `httpOnly`, `sameSite: "lax"`, `secure` in production; 7-day expiry (tenant), 24-hour (super-admin).

## Tenant login flow

1. Staff visits their temple's own subdomain/custom domain (resolved by hostname via `lib/auth/tenant-host.ts`'s `resolveTenantHost()`, reading `x-forwarded-host`/`host`, with a `TEMPLEOS_LOCAL_TENANT_HOST` dev-only override explicitly ignored in production).
2. `features/auth/tenant-login-form.tsx` drives Firebase client SDK phone-OTP (reCAPTCHA + SMS), yielding a Firebase ID token.
3. `POST /api/auth/session`: resolves tenant from `Host` header (`getActiveTenantDomainByHostname`), verifies the ID token server-side (`lib/firebase/admin.ts`), looks up/binds a `persons` row by phone, finds the active `tenant_memberships` row for `(person, tenant)`, sets the session cookie, updates `touchLastSignedIn`.
4. Every subsequent request: `getSessionAdmin()` re-verifies the cookie, **re-fetches the live membership row** (role changes/removal take effect next request, not next login), and **re-checks `tenant.status === "active"`** — a single shared kill-switch: suspending a tenant instantly locks out all its staff on their very next request.

## Authorization tiers

- **Guest/public**: marketing pages, `/login`, `/whatsapp-onboarding`, `GET /api/auth/tenant-context`, the WhatsApp webhook.
- **Devotee**: not an authenticable identity at all — no login, no session. Devotees exist purely as `devotees` rows receiving WhatsApp notifications and replying to the chatbot webhook.
- **Tenant staff, non-admin** (`priest`, `committee_member`, `volunteer`): can hold a valid session but every dashboard page/mutating route additionally requires `roles.includes("admin")`. These 3 role codes exist in the schema/type system but no page or route currently branches on them — no distinct permissions today.
- **Tenant admin**: `roles.includes("admin")` — reaches `requireDashboardAdmin()` (pages) / `requireTenantAdminSession()` (API). Additionally gated per-feature by `lib/auth/features.ts`'s `requireTenantFeature`/`requireTenantFeatureApi`, which renders a plain 404 rather than 403 when a module is disabled — deliberately indistinguishable from "doesn't exist."
- **Super admin**: entirely separate login/session/cookie/table. `requireSuperAdminPage()` distinguishes "no cookie" (redirect) from "cookie present but invalid/inactive" (403).
- **Cron**: `isAuthorizedCronRequest()` — `timingSafeEqual` bearer-token check, not tied to any user identity.
- **Meta webhook**: `GET` validates `hub.verify_token` (one-time subscription handshake). **`POST` has no signature verification at all** — see [Security-Architecture.md](./Security-Architecture.md).
- **WhatsApp onboarding handoff**: neither session nor shared secret — a short-lived signed handoff token (same `createSignedSessionToken` primitive, different payload) because the embedded-signup redirect lands on a fixed domain with no tenant cookie.

## Cross-references

- [Security-Architecture.md](./Security-Architecture.md) — the webhook signature gap and full auth-guard coverage check
- [Route-Inventory.md](./Route-Inventory.md) — auth pattern per route
- [Audit/lib/auth/](./Audit/) — per-file audits (Phase 2, Batch 1)
- [Firebase-Console-Prerequisites.md](./Firebase-Console-Prerequisites.md) — one-time Firebase project/Console setup phone-OTP login depends on, and how to tell an environment-config failure apart from an in-app authorization rejection
