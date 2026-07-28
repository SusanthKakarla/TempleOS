# TempleOS — Razorpay Partner OAuth Onboarding (dual connection method)

Deliverables for the "Razorpay Partner OAuth Onboarding" spec: a temple can now connect Razorpay
either by pasting its own Key ID/Key Secret (existing, unchanged) or by clicking "Connect
Razorpay" and completing Razorpay's own OAuth login/consent flow — with checkout, webhooks,
refunds, and reconciliation working identically regardless of which method a tenant used.
Builds on the payment framework and refunds/reconciliation work covered in
[EL10-PAYMENT-AUDIT-AND-GAP-ANALYSIS.md](./EL10-PAYMENT-AUDIT-AND-GAP-ANALYSIS.md) and
[EL10-PAYMENT-REFUNDS-RECONCILIATION-REPORT.md](./EL10-PAYMENT-REFUNDS-RECONCILIATION-REPORT.md).

## 1-3. Audit, Reuse, Gap Analysis

Confirmed against Razorpay's current Partner Integration docs before writing any code:
`https://auth.razorpay.com/authorize` → `https://auth.razorpay.com/token` (code exchange /
refresh) → `access_token` (90-day expiry) / `refresh_token` (180-day expiry) / `public_token` /
`razorpay_account_id`. The `razorpay` npm package (already a dependency) accepts
`new Razorpay({ oauthToken })` directly (confirmed by reading its source), so every existing
adapter call keeps working once the client is constructed correctly — no hand-rolled
Bearer-auth HTTP calls needed for the payment API itself, only for the OAuth token endpoint
(`auth.razorpay.com`, a different host the SDK doesn't wrap).

**No new services, tables, or endpoints were duplicated.** `PaymentProviderService`,
`WebhookService`, `RefundService`, `ReconciliationService`, `tenant_payment_accounts`, and
`tenant_payment_credentials` are all extended in place, not forked. The one genuinely new
concept — Partner platform credentials — is env-var-based, mirroring the one existing precedent
for this exact pattern (Meta WhatsApp Embedded Signup's `WHATSAPP_APP_SECRET`/
`WHATSAPP_ONBOARDING_ORIGIN`), not a new Super-Admin database-backed settings page.

**One flagged, unverifiable-here assumption:** OAuth-connected sub-merchants have no `key_secret`
of their own, so Checkout/webhook HMAC signatures for OAuth-mode tenants are verified against the
Partner application's own `RAZORPAY_PARTNER_CLIENT_SECRET` (the most commonly documented answer)
instead. This cannot be confirmed end-to-end without a live Razorpay Partner application and a
real OAuth-connected test account — flagged the same way Meta template approval has been a
disclosed limitation throughout this project.

## 4. Database Changes

`migrations/028_razorpay_partner_oauth.sql` (additive, applied):
- `tenant_payment_accounts.connection_method` (`'manual' | 'partner'`, default `'manual'`) and
  `.razorpay_account_id` (unique, partner mode only — resolves an incoming partner webhook's
  `account_id` back to a tenant).
- `tenant_payment_accounts.contact_email` made nullable — Partner OAuth's token response never
  returns an email, and this app collects none anywhere else (phone-OTP auth only).
- `tenant_payment_credentials`: `key_id`/`encrypted_key_secret` made nullable; added
  `encrypted_access_token`, `encrypted_refresh_token`, `access_token_expires_at`, `public_token`
  (not a secret, stored plain like `key_id`); a CHECK constraint enforces exactly one credential
  shape per row (api_key OR oauth, never both/neither).

## 5. Credential & Adapter Changes

`lib/payments/provider.ts`'s `DecryptedCredentials` became a discriminated union
(`{mode: "api_key", keyId, keySecret, webhookSecret}` | `{mode: "oauth", accessToken,
refreshToken, accessTokenExpiresAt, publicToken, webhookSecret}`). Every consumer branches on
`.mode` instead of assuming one shape:
- `lib/db/tenant-payment-accounts.ts::getDecryptedCredentialsForAccount` — branches on which
  credential columns are populated (the CHECK constraint guarantees only one shape ever exists).
- `lib/payments/adapters/razorpay-adapter.ts` — new private `buildClient(creds)` helper chooses
  `{ oauthToken }` vs `{ key_id, key_secret }`; all 4 existing call sites (`validateCredentials`,
  `createOrder`, `refundPayment`, `fetchOrderPayment`) now go through it. `verifyCheckoutSignature`
  /`verifyWebhookSignature` use a new `resolveSigningSecret(creds)` helper: `api_key` mode is
  unchanged (tenant's own `keySecret`); `oauth` mode uses `RAZORPAY_PARTNER_CLIENT_SECRET`.
- `lib/payments/payment-provider-service.ts::createOrderForTenant` — the public-facing "key" the
  Checkout widget needs is the tenant's `keyId` in manual mode, or the Partner-issued
  `publicToken` in OAuth mode (Razorpay docs: "public_token can replace key_id for public-facing
  implementations such as Razorpay Checkout").

## 6. OAuth Connect Flow

- `lib/payments/oauth-handoff.ts` — `createOAuthState`/`verifyOAuthState`, built on the existing
  generic `lib/auth/session-token.ts` primitive (not the WhatsApp-specific handoff wrapper, since
  this is a plain single-redirect OAuth 2 flow, not a two-phase popup handoff).
- `lib/payments/razorpay-oauth-client.ts` — plain `fetch` calls to `auth.razorpay.com`
  (`buildAuthorizeUrl`, `exchangeAuthorizationCode`, `refreshAccessToken`,
  `isPartnerOnboardingConfigured`) since this host is outside the `razorpay` package's API
  surface.
- `POST /api/payments/oauth/start` (tenant-admin auth, mirrors
  `app/api/whatsapp/connect/start/route.ts`) — returns the Razorpay authorize URL with a signed
  `state`; 500s gracefully if the Partner app isn't configured.
- `GET /api/payments/oauth/callback` (public — Razorpay redirects the browser here directly) —
  verifies `state`, exchanges `code`, encrypts the token pair, stores via the new
  `linkPartnerPaymentAccountForTenant`, redirects back to Settings → Payments with a
  `razorpay_oauth_connected`/`razorpay_oauth_error` query flag the UI turns into a toast.
- `lib/db/tenant-payment-accounts.ts::linkPartnerPaymentAccountForTenant` — the OAuth-connect
  equivalent of the existing `connectPaymentAccount` (deactivates any prior active account, same
  transaction shape, `connection_method: 'partner'` instead of `'manual'`).

## 7. Token Refresh

Folded into the **existing** nightly `reconciliation-service.ts::reconcileAllTenants` loop
(not a new cron) — for each `connectionMethod === 'partner'` account whose
`access_token_expires_at` is within 7 days, `refreshOAuthTokenIfNeeded` calls
`refreshAccessToken` and persists the new pair via the new
`updateOAuthTokensForAccount`. A failed refresh is audit-logged
(`payment_account.oauth_token_refresh_failed`) and never throws — one tenant's expired refresh
token can't abort the nightly run for everyone else.

## 8. Partner Webhook

`app/api/webhooks/razorpay/partner/route.ts` — one platform-level endpoint shared by every
OAuth-connected tenant (manual-mode tenants keep their existing per-tenant
`/api/webhooks/razorpay/[tenantId]` URL, unchanged). Verified against
`RAZORPAY_PARTNER_WEBHOOK_SECRET` via `payment-provider-service.ts::verifyPartnerWebhookSignature`
— which reuses the adapter's existing HMAC verification rather than duplicating it. The tenant is
resolved only *after* the signature is trusted, by matching the payload's `account_id` against
`tenant_payment_accounts.razorpay_account_id` (`getPaymentAccountByRazorpayAccountId`). Dispatch
itself (`dispatchWebhookEvent`) is now a function shared by both the manual and partner routes in
`webhook-service.ts` — zero new event-processing logic, just a different
signature/tenant-resolution step ahead of the same `applyPaymentEvent`/`applyRefundEvent` calls.
`PaymentWebhookEvent`/`RazorpayWebhookPayload` gained a `providerAccountId`/`account_id` field to
carry this through `parseWebhookEvent`.

## 9. UI Changes

- **Settings → Payments** (`features/payments/razorpay-connection-card.tsx`) — when not
  connected, a `Tabs` control offers "Manual API Keys" (existing form, unchanged) or "Connect via
  Razorpay" (a single button calling `oauth/start` and redirecting the browser to Razorpay). The
  connected view now also shows which connection method is in use, and displays "Not provided"
  for `contactEmail` when null (Partner mode). Query-param feedback
  (`razorpay_oauth_connected`/`razorpay_oauth_error`) from the callback redirect is surfaced as a
  toast and stripped from the URL.
- **Super Admin provisioning wizard** (`features/super-admin/new-temple-form.tsx`) — the Payment
  Integration step gained the same method choice; choosing "Connect via Razorpay" shows an
  informational note instead of the key-entry form (OAuth requires a live browser redirect that
  can't happen mid-wizard) and simply skips sending a `paymentAccount` payload — the temple admin
  completes the actual connection later from Settings, matching the existing "no live per-step
  calls in this wizard" precedent. No server-side wizard/API changes were needed for this.

## 10. Security Review

- OAuth `state` is signed and expires after 10 minutes (`lib/payments/oauth-handoff.ts`) —
  re-establishes the tenant/admin identity on the public callback route without a session cookie
  (Razorpay's redirect is a fresh browser navigation with none).
- Access/refresh tokens are encrypted at rest with the same AES-256-GCM helper as manual-mode
  key secrets; `public_token` is stored plain, matching `key_id`'s own precedent (not a secret).
- The partner webhook trusts the payload's `account_id` only *after* verifying the platform
  webhook signature — never resolves a tenant from unverified input.
- `RAZORPAY_PARTNER_CLIENT_SECRET`/`RAZORPAY_PARTNER_WEBHOOK_SECRET` are never returned by any
  API response and never visible to a Temple Admin — same posture as every other platform secret
  in this codebase.
- Manual-mode tenants are entirely unaffected: their own `key_id`/`key_secret`/`webhook_secret`
  continue to sign their own checkout/webhook traffic exactly as before.

## 11. Testing Report

`npx tsc --noEmit` clean. `npx eslint .` clean (the same one pre-existing, unrelated warning from
a concurrent session's commit, untouched by this work). `npx vitest run` — **669/669 passing**
(27 new/updated across 6 files): `getDecryptedCredentialsForAccount`'s api_key/oauth branching
(new `lib/db/tenant-payment-accounts.test.ts`); `RazorpayAdapter`'s OAuth-mode signature
verification and `account_id` extraction; `oauth-handoff.ts`'s state token round-trip/tamper/expiry
(new `lib/payments/oauth-handoff.test.ts`); `razorpay-oauth-client.ts`'s authorize-URL building and
token exchange/refresh request shape (new `lib/payments/razorpay-oauth-client.test.ts`, network
mocked); `payment-provider-service.ts`'s Partner public-key selection and
`verifyPartnerWebhookSignature`; the reconciliation loop's token-refresh window logic (refreshes
within 7 days, skips otherwise, audit-logs and continues past a failed refresh); and the partner
webhook's tenant-resolution-by-`account_id` dispatch routing, including the 404 (unknown account)
and 400 (bad signature) paths. `npm run build` — zero errors; `/api/payments/oauth/start`,
`/api/payments/oauth/callback`, and `/api/webhooks/razorpay/partner` all confirmed present in the
route listing.

**Cannot be verified from this environment** (no live Razorpay Partner application exists here):
the actual `/authorize` redirect and consent screen, a real code-for-token exchange, a live
Partner webhook delivery, and — most importantly — whether the `RAZORPAY_PARTNER_CLIENT_SECRET`
signing assumption for OAuth-mode Checkout/webhooks is correct. **Recommended before relying on
this in production:** register a real Razorpay Partner application, connect one test tenant
through the full OAuth flow in Razorpay's sandbox, and confirm a real checkout payment's
signature verifies.

## 12. Files Modified/Created

**New (11):** `migrations/028_razorpay_partner_oauth.sql`, `lib/payments/oauth-handoff.ts`
(+test), `lib/payments/razorpay-oauth-client.ts` (+test), `app/api/payments/oauth/start/route.ts`,
`app/api/payments/oauth/callback/route.ts`, `app/api/webhooks/razorpay/partner/route.ts`,
`lib/db/tenant-payment-accounts.test.ts`, this report.

**Modified:** `types/db.ts` (`PaymentConnectionMethod`, `TenantPaymentAccount` fields,
`contactEmail` nullable), `lib/payments/provider.ts` (`DecryptedCredentials` union,
`PaymentWebhookEvent.providerAccountId`), `lib/payments/adapters/razorpay-adapter.ts`
(`buildClient`, `resolveSigningSecret`, `account_id` parsing, +test), `lib/db/tenant-payment-accounts.ts`
(credential branching, `linkPartnerPaymentAccountForTenant`, `updateOAuthTokensForAccount`,
`getPaymentAccountByRazorpayAccountId`), `lib/payments/payment-provider-service.ts` (OAuth-aware
`createOrderForTenant`, `validateCredentials` union fix, `verifyPartnerWebhookSignature`, +test),
`lib/payments/webhook-service.ts` (shared `dispatchWebhookEvent`, `handleRazorpayPartnerWebhook`,
+test), `lib/payments/reconciliation-service.ts` (token-refresh step, +test), `lib/payments/payment-audit.ts`
(`oauthTokenRefreshFailed`), `features/payments/razorpay-connection-card.tsx` (method choice,
OAuth connect button, redirect-feedback toast), `features/super-admin/new-temple-form.tsx`
(provisioning-time method choice), `locales/{en,te}/dashboard.json` (method/oauth strings),
`.env.example` (Partner OAuth env vars).

## 13. Future Provider Extension Guide

Unchanged: adding Stripe/Cashfree/PhonePe/PayU means one new adapter file implementing the same
`PaymentProviderAdapter` interface plus one registry entry — refunds, reconciliation, and the
dual-connection-method pattern established here don't require touching anything else, since every
caller already goes through `PaymentProviderService`, never a concrete adapter.
