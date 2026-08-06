# TempleOS — PhonePe Partner-Readiness Architecture

Prepares the codebase so that when PhonePe grants TempleOS official Payment Gateway Partner
API access, only a small, isolated set of files need real implementations plugged in — the
donation flow, webhooks, receipts, WhatsApp notifications, reconciliation, audit logging, and
tenant isolation continue working unmodified, exactly as they already do for Razorpay's real
Partner OAuth today. Builds on
[EL10-PAYMENT-PARTNER-OAUTH-REPORT.md](./EL10-PAYMENT-PARTNER-OAUTH-REPORT.md) (the Razorpay
Partner implementation this mirrors) and the PhonePe manual-connect work from earlier sessions.

**No fake OAuth was built.** PhonePe still has no public self-service Partner/OAuth API —
verified live against developer.phonepe.com and PhonePe's own merchant-aggregator signup form
twice already in this project (merchant approval there remains a manual KYC business process,
not a redirect-based token exchange). Every new file in this pass either (a) is a pure scaffold
that reports "not yet available" rather than fabricating a response, or (b) is a genuinely
working, non-fake feature (the Super Admin platform toggles) that reuses the existing
`payment_providers` catalog table.

## 1. Conceptual method → real implementation mapping

The request asked for a `PhonePeProvider` exposing `connect()`/`disconnect()`/
`refreshConnection()`/`verifyConnection()`/`createOrder()`/`verifyPayment()`/`refund()`/
`generatePaymentLink()`/`reconcilePayments()`/`processWebhook()`. In this codebase's actual
architecture, `PaymentProviderAdapter` (`lib/payments/provider.ts`) is a pure, stateless API
client — it never touches the database. Connect/disconnect are DB-writing **repository**
operations, already fully provider-generic. Adding connect/disconnect methods to the adapter
interface would duplicate that layer rather than reuse it. Instead, every conceptual method
already has a real, provider-generic home:

| Conceptual method | Real implementation | Status |
| --- | --- | --- |
| `connect()` | `PUT /api/payments/accounts/phonepe` (tenant) or `PUT /api/super-admin/temples/[tenantId]/payments/phonepe` (Super Admin) → `connectPaymentAccountForSuperAdmin` (`lib/db/tenant-payment-accounts.ts`) | Implemented (manual mode) |
| `disconnect()` | `DELETE /api/payments/accounts/[id]` → `disconnectPaymentAccount` | Implemented, fully generic |
| `verifyConnection()` | `validateCredentials("phonepe", ...)` (`lib/payments/payment-provider-service.ts`), called at connect-time | Implemented |
| `refreshConnection()` | N/A for manual mode (no token to refresh). For future partner mode: `reconciliation-service.ts`'s `refreshOAuthTokenIfNeeded`, already guarded by `connectionMethod !== "partner"` — a no-op for every PhonePe account today, so this "just works" the day partner accounts exist | Guard already in place |
| `createOrder()` | `phonepeAdapter.createOrder` via `createOrderForTenant` | Implemented |
| `verifyPayment()` | `phonepeAdapter.fetchOrderPayment` (reconciliation) + webhook-driven `applyPaymentEvent` (authoritative) | Implemented |
| `refund()` | `phonepeAdapter.refundPayment` via the generic `refundPayment` service wrapper | Implemented (no live UI/route calls it yet — same as Razorpay; not new PhonePe-specific scope) |
| `reconcilePayments()` | `reconciliation-service.ts`'s `reconcileTenant`/`reconcileAllTenants`, provider-generic via `getAdapter(account.providerKey)` | Implemented |
| `processWebhook()` | `handlePhonePeWebhook` (per-tenant, `webhook-service.ts`) | Implemented |
| `generatePaymentLink()` | Not implemented for **either** provider — a pre-existing shared gap (this app creates Orders + redirect/popup checkout, never Payment Links), not new PhonePe-specific scope | Not implemented (both providers) |

## 2. What's new in this pass

**Genuinely working (not scaffolding):**
- `migrations/038_payment_provider_platform_settings.sql` — extends the existing
  `payment_providers` catalog (unchanged since it was created; confirmed via grep across every
  migration) with `manual_enabled`, `partner_enabled`, `default_connection_method`. Generic
  across every provider, not PhonePe-specific columns.
- `lib/db/payment-providers.ts` — `listPaymentProviders()` / `updatePaymentProviderSettings()`.
- Super Admin **Platform Payment Settings** page (`/super-admin/payment-settings`) — the first
  place in this app a Super Admin can toggle a provider's availability/connection modes without
  writing SQL, for both Razorpay and PhonePe. No existing page to extend; confirmed via
  directory listing that `(shell)/` only had Temples/Admins/Roles before this.

**Scaffolds that honestly report "not yet available" (no fabricated behavior):**
- `lib/payments/phonepe-oauth-client.ts` — mirrors `razorpay-oauth-client.ts`'s exact export
  shape (`isPartnerOnboardingConfigured`, `buildAuthorizeUrl`, `exchangeAuthorizationCode`,
  `refreshAccessToken`) so a real implementation is a drop-in file replacement later.
  `isPartnerOnboardingConfigured()` checks for `PHONEPE_PLATFORM_CLIENT_ID`/
  `PHONEPE_PLATFORM_CLIENT_SECRET` — unset today, so always `false`. The other three throw
  `"PhonePe Partner Onboarding is not yet available"`.
- `app/api/payments/phonepe/callback/route.ts` — reuses `lib/payments/oauth-handoff.ts`'s
  `createOAuthState`/`verifyOAuthState` unmodified (already 100% provider-generic — no changes
  needed there). Short-circuits after state verification since
  `isPartnerOnboardingConfigured()` is always false, and redirects to
  `/dashboard/settings?phonepe_oauth_error=not_available`. No "start" route exists yet, since
  the tenant-facing "Connect PhonePe" button intentionally still opens the manual credential
  dialog — this callback is unreachable through the UI today by design, existing purely as the
  prepared landing point.
- `app/api/webhooks/phonepe/partner/route.ts` + `handlePhonePePartnerWebhook` — mirrors
  `app/api/webhooks/razorpay/partner/route.ts` structurally (thin route, all logic in
  `webhook-service.ts`). Since no platform-wide PhonePe webhook secret or partner-account-id
  scheme exists yet, it logs the hit via the existing `logPaymentWebhook` (same audit trail
  every other webhook gets, even rejected traffic) and returns 501 — it does not fabricate a
  signature-verification scheme.
- `PaymentAuditService.partnerOnboardingNotAvailable` — thin wrapper over the existing
  `createAuditLogEntry`, no schema change, used by the callback stub.

## 3. Explicitly not built

No fake OAuth authorize/token exchange. No fake partner webhook signature scheme. No new
`tenant_payment_accounts` columns for a partner-account-id that has no real values to hold yet
(a real future PhonePe Partner column would need its own migration at that time — the existing
`razorpay_account_id` column cannot be safely shared across two providers' ID-spaces, since it's
a single table-wide `UNIQUE` column). No third `connection_method` state — `"manual" | "partner"`
is sufficient; PhonePe's manual accounts need no new state.

## 4. When PhonePe grants Partner API access — the only files that change

1. `lib/payments/phonepe-oauth-client.ts` — implement the four functions for real against
   PhonePe's actual authorize/token endpoints (same shape as `razorpay-oauth-client.ts`).
2. A new "start" route (mirrors `app/api/payments/oauth/start/route.ts`) — the tenant-facing
   button's target changes from opening the credential dialog to POSTing here.
3. `app/api/payments/phonepe/callback/route.ts` — replace the short-circuit with a real
   `exchangeAuthorizationCode` call + `linkPartnerPaymentAccountForTenant`-style DB write
   (already generic — `linkPartnerPaymentAccountForTenant` in `lib/db/tenant-payment-accounts.ts`
   takes a `providerKey`, no Razorpay-only assumption in its signature).
4. `handlePhonePePartnerWebhook` — implement signature verification against a real
   `PHONEPE_PLATFORM_WEBHOOK_SECRET` and tenant resolution against a real (new, migrated)
   partner-account-id column, then call the already-generic `dispatchWebhookEvent`.
5. Toggle `partner_enabled = true` for the `phonepe` row via the Super Admin Platform Payment
   Settings page built in this pass.

**Zero changes** to: `campaign-payment-service.ts`, `donation-checkout-service.ts`,
`webhook-service.ts`'s `dispatchWebhookEvent`, receipt generation, WhatsApp notification
triggers, `reconciliation-service.ts`'s core loop, `payment-audit.ts`'s existing methods, or any
UI beyond the tenant-facing button's click target — the credential dialog it opens today simply
stops being reachable once the button's target changes, no redesign needed.

## 5. Security review

- Platform credentials (`PHONEPE_PLATFORM_*`) remain env-var-only, never DB-stored, mirroring
  the existing Razorpay Partner and WhatsApp Embedded Signup precedent — the Super Admin page
  added in this pass shows only **presence** (✓/✗), never values, for any platform credential.
- Tenant-level secrets continue through the existing `lib/payments/crypto.ts` AES-256-GCM
  encryption — untouched.
- The webhook stub logs every hit (valid or not) via the existing `logPaymentWebhook`, so a
  probing attacker hitting the new partner webhook path leaves the same audit trail every other
  webhook endpoint already produces — no silent 501s.
- The callback stub never accepts or stores anything — it only verifies (and discards) a
  short-lived signed `state` token before redirecting; there is no code path where it could be
  tricked into creating a payment account, since `linkPartnerPaymentAccountForTenant` is never
  called from it in this pass.
