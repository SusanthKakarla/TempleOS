# TempleOS — Multi-Tenant Payment Provider Framework (Razorpay V1)

Full deliverables for the payment architecture spec: audit, database changes, API endpoints,
backend services, Razorpay integration, provider framework, webhook architecture, donation-link
architecture, WhatsApp template integration, receipt generation, files modified, migrations,
security review, testing plan, and the future-provider extension guide.

## 1. Architecture Audit

Confirmed by direct code reading (not assumption) before writing anything:

- **Campaigns already track donation goals/dates/links** (migrations 022/023, from an earlier session) — `goal_amount`, `campaign_start_date/end_date`, `donation_link_override`, plus a live-derived raised amount (`getCampaignDonationSummary` sums `donations` by `purpose`, never a stored counter). The `donation_campaign_broadcast` WhatsApp template (Temple/Campaign/Goal/Progress/Link) already existed end-to-end — this spec's Phase 10 was already done; only the *receipt* template was new.
- **`DONATION_LINK_BASE_URL` already existed** as a placeholder (`{base}/{campaignId}`, no real checkout behind it) — extended in place to the real `{base}/{tenantSlug}/{campaignSlug}/{donationToken}` shape, not replaced.
- **Donations already have a "manual donor" path** (no devotee record required) from the prior UI-polish pass — an online Razorpay donation reuses this shape exactly (`payment_method='razorpay'`), rather than inventing a new donor concept.
- **No per-tenant secret storage or encryption existed anywhere** — WhatsApp uses one shared platform-level token (`WHATSAPP_ACCESS_TOKEN`), never a per-tenant secret in Postgres. This is genuinely new infrastructure for this codebase.
- **No webhook signature verification existed anywhere** — the existing WhatsApp webhook has none (a separately-tracked, pre-existing P0 finding). The new Razorpay webhook does not repeat this gap.
- **No rate limiting, no public/unauthenticated page routes, no receipt/PDF-of-a-transaction concept** existed before this work.
- **Temple provisioning is a single-file, 5-step client form** (`new-temple-form.tsx`) with zero live per-step backend calls — every step, including the closest analog (WhatsApp), is pure client-side collection submitted once at the end. The new Payment step follows this exact precedent.

## 2. Database Changes

New migration `025_payment_provider_framework.sql`:
- `payment_providers` — static catalog (razorpay `active`; stripe/cashfree/phonepe/payu `coming_soon`), same pattern as the existing `features` table.
- `tenant_payment_accounts` — one row per tenant-provider connection (mirrors `whatsapp_accounts`), partial unique index enforcing at most one `is_active` row per tenant.
- `tenant_payment_credentials` — separated from the account row so a routine "list connected providers" query never risks `SELECT *`-ing a secret column.
- `payment_transactions` — the order/payment lifecycle AND the campaign→donation link in one row (no separate "Campaign Payment Mapping" table — this row already is that mapping).
- `payment_webhook_logs` — raw audit trail for every inbound webhook hit.
- `campaigns.slug` / `campaigns.donation_token` — added (slug mirrors `tenants.slug`'s pattern; token is a stable-per-campaign, crypto-random, unguessable identifier).
- `donations.payment_method` CHECK widened to add `'razorpay'` (same drop/recreate pattern used twice before in this codebase).

New migration `026_notification_raw_phone_recipient.sql`: `notifications.recipient_phone` + widened `notifications_check` — a genuine architecture gap found mid-build (see §9).

Both applied successfully against the live/dev database.

## 3. API Endpoints

| Route | Purpose |
|---|---|
| `POST/DELETE /api/payments/accounts[/:id]` | Tenant-admin connect/disconnect Razorpay |
| `GET /api/payments/transactions` | Tenant-admin transactions list + dashboard summary |
| `POST /api/public/donate/[tenantSlug]/[campaignSlug]/[token]` | Public — creates a Razorpay order |
| `POST /api/public/donate/verify` | Public — fast client-side ack only (webhook remains authoritative) |
| `POST /api/webhooks/razorpay/[tenantId]` | Razorpay webhook receiver, one URL per tenant |
| `POST /api/super-admin/temples` | Existing route, payload extended with an optional `paymentAccount` block |

## 4. Backend Services (Phase 17)

| Service | File |
|---|---|
| `PaymentProviderService` | `lib/payments/payment-provider-service.ts` — the *only* chokepoint anything calls; resolves a tenant's active provider + adapter |
| `RazorpayAdapter` | `lib/payments/adapters/razorpay-adapter.ts` |
| `DonationCheckoutService` | `lib/payments/donation-checkout-service.ts` |
| `WebhookService` | `lib/payments/webhook-service.ts` |
| `CampaignPaymentService` | `lib/payments/campaign-payment-service.ts` |
| `ReceiptService` | `lib/receipts/receipt-service.ts` + `receipt-pdf.ts` |
| `PaymentAuditService` | `lib/payments/payment-audit.ts` — thin wrapper over the existing `audit_log` table |
| Encryption | `lib/payments/crypto.ts` (AES-256-GCM) |

Campaigns/donations/checkout/webhook code never imports `RazorpayAdapter` or the `razorpay` package directly — only `PaymentProviderService`.

## 5. Razorpay Integration

`RazorpayAdapter` implements `createOrder`, `verifyCheckoutSignature`, `verifyWebhookSignature`, `parseWebhookEvent`, `validateCredentials` using the official `razorpay` npm package for order creation, but **hand-rolled HMAC-SHA256 + `timingSafeEqual` for both signature checks** — the package's own `Razorpay.validateWebhookSignature`/`validatePaymentVerification` helpers compare with a plain `===`, which is not constant-time; verified this directly by reading the SDK's source before deciding not to use it, matching this codebase's one real precedent for signature verification (`lib/auth/session-token.ts`).

## 6. Payment Provider Framework

```
DonationCheckoutService / CampaignPaymentService / WebhookService
              │
              ▼
      PaymentProviderService
              │  (looks up active account, decrypts credentials, dispatches by provider_key)
              ▼
      PaymentProviderAdapter (interface)
        ├── RazorpayAdapter   (built now)
        └── Stripe/Cashfree/PhonePe/PayU  (interface ready, adapters not written)
```
Adding a provider later = one new adapter file implementing the 5-method interface + one registry entry in `payment-provider-service.ts`. Zero changes anywhere else — the Super Admin wizard's provider selector, the tenant Payment Settings UI, checkout, and the webhook route are all already provider-key-driven, not Razorpay-hardcoded.

## 7. Webhook Architecture

- One URL per tenant (`/api/webhooks/razorpay/[tenantId]`) — Razorpay is configured per-account, and each temple has its own account/keys, so the tenant must be known *before* attempting signature verification (no brute-forcing every tenant's secret against every hit).
- Raw body read as text (never `req.json()` first — the HMAC is computed over the exact bytes sent).
- **Every hit logged unconditionally** to `payment_webhook_logs` (valid or not, recognized or not) — the exact class of gap the existing WhatsApp webhook has and never got fixed for.
- **Idempotency by state-transition, not by trusting a redelivery id**: `UPDATE payment_transactions SET status='captured' ... WHERE status <> 'captured'` — a redelivered event finds zero rows the second time and all side effects (donation, receipt, WhatsApp send) are skipped. More robust than event-id deduplication.

## 8. Donation Link Architecture

`/donate/{tenantSlug}/{campaignSlug}/{donationToken}` — `tenantSlug` reuses the tenant's existing unique slug; `campaignSlug` and `donation_token` are new, generated at campaign-insert time (`lib/db/campaigns.ts`'s `createCampaign`). The token is stable per campaign (every donor who receives the link reuses the same one — not single-use) and unguessable (16 random bytes, base64url). `loadDonationCheckoutContext` (`lib/payments/donation-checkout-service.ts`) is the one load/validate chain: bad tenant, bad campaign, wrong token (constant-time compared), campaign not running, or no provider connected all render the *same* generic "this donation link isn't available" state — never reveals which check failed.

## 9. WhatsApp Template Integration

- `donation_receipt` registered via the established 3-file pattern (catalog + notification-template seed + `NotificationType` union entry) — Temple Name, Amount, Campaign, Receipt Number, Transaction ID, Date, Receipt Link.
- **Genuine architecture gap found and fixed**: the notification engine could only address a recipient by `personId` or `devoteeId` — a Razorpay checkout donor is neither. Extended `enqueueNotification`'s `Recipient` union with a third `{ phone }` kind (migration 026, `notifications.recipient_phone`), with no opt-in/preference gate for it (they just completed a payment they initiated). This is a real, reusable engine capability, not a payment-specific hack — any future feature needing to message a non-devotee/non-member phone number benefits.
- A second new type, `payment_captured` (in-app only, no WhatsApp variant), fans out to every active tenant admin via the existing Notification Center — this satisfies "Notify Temple Dashboard" without inventing new real-time push infrastructure, which doesn't exist anywhere in this app.

## 10. Receipt Generation Flow

`lib/receipts/receipt-pdf.ts` (new `pdfkit` layout, portrait, not a reuse of the existing landscape export-table layout but the same library) → `lib/receipts/receipt-service.ts` generates a receipt number (`{TENANT_SLUG}-{YYYYMMDD}-{random8hex}`, no sequence-table needed since it's already globally unique) → uploads via the existing `lib/media/imagekit.ts` helper under an unguessable path → both values stamped onto `payment_transactions`. Triggered exactly once per transaction, from the webhook's idempotent capture path only.

## 11. Files Modified/Created (highlights)

**New (32):** `migrations/025_*.sql`, `migrations/026_*.sql`, `lib/payments/*` (8 files), `lib/receipts/*` (2 files + 2 tests), `lib/db/tenant-payment-accounts.ts`, `lib/db/payment-transactions.ts` (+test), `lib/db/payment-webhook-logs.ts`, `lib/validation/payments.ts`, 6 new API routes, `features/payments/*` (4 files), `app/(dashboard)/dashboard/payments/page.tsx`, `app/(dashboard)/dashboard/settings/payments/page.tsx`, `app/(donate)/**` (layout + page).

**Modified:** `types/db.ts` (payment types, `NotificationType`×3, `PaymentMethod`, `Notification.recipientPhone`), `lib/db/campaigns.ts` (slug/token generation, new lookup), `lib/db/notifications.ts`/`lib/notifications/engine.ts`/`delivery.ts` (raw-phone recipient), `lib/db/notification-templates.ts` + `lib/whatsapp/standard-template-catalog.ts` (2 new template keys), `lib/campaigns/donation-message.ts` (real donation link), `lib/provisioning/temples.ts` + `new-temple-form.tsx`/`-helpers.ts` (Payment step), `scripts/provision-temple.mts` (CLI parity), `features/dashboard/app-sidebar.tsx` (nav entry), `app/(dashboard)/dashboard/settings/page.tsx` (link), `lib/validation/donations.ts` (payment method enum), `locales/{en,te}/dashboard.json`.

## 12. Security Review

- Credentials encrypted at rest (AES-256-GCM, fresh IV per encryption) — never returned from any API response.
- Webhook and checkout signatures both verified with length-check + `timingSafeEqual` — deliberately not the SDK's own non-constant-time comparison (confirmed by reading its source).
- Idempotent-by-state-transition capture prevents double-processing/double-donations regardless of webhook redelivery behavior.
- In-memory sliding-window rate limiter (20 req/min/IP) on the two new public routes — the only genuinely new unauthenticated attack surface this feature introduces.
- Every connect/disconnect/capture/fail/refund event audit-logged via the existing `audit_log` table.
- The public donation page/API never leaks *why* a link is invalid.
- **Bug found and fixed during smoke-testing** (see §13): the webhook route initially 500'd on a bogus/nonexistent tenant id because the "no active account" log-write passed the unverified tenant id straight into a column with a real FK constraint. Fixed to log `tenantId: null` in that branch — verified with a follow-up request returning a clean 404.

## 13. Testing Plan / What Was Verified

**Automated:** `npx tsc --noEmit` clean, `npx eslint .` clean, `npx vitest run` — 621/621 passing, including new suites: `lib/payments/crypto.test.ts` (encrypt/decrypt round-trip, tamper detection, key-length validation, constant-time compare), `lib/payments/adapters/razorpay-adapter.test.ts` (checkout + webhook signature accept/reject, event parsing for captured/refund/unrecognized/malformed), `lib/db/payment-transactions.test.ts` (idempotent-capture SQL shape and behavior), `lib/payments/payment-provider-service.test.ts` (registry resolution, unregistered-provider error), `lib/receipts/receipt-service.test.ts` (receipt number format, anonymous-donor masking). `npm run build` — zero errors, all new routes listed.

**Manual, in this environment:** started the production build and smoke-tested the public routes directly — the donate page with a bogus tenant/campaign/token renders the graceful "not available" state (200, not a crash); the webhook route with a bogus tenant now returns a clean 404 (post-fix); `/login` unaffected (no regression). This is how the webhook bug in §12 was actually caught.

**Cannot be verified from this environment** (no live Razorpay account/sandbox keys): an actual order creation call, a real checkout completing, a real signed webhook delivery, Meta approving the `donation_receipt` template. Same disclosed-limitation pattern as prior WhatsApp-template work in this repo.

## 14. Future Provider Extension Guide

To add e.g. Stripe:
1. Flip `payment_providers.status` for `stripe` from `coming_soon` to `active` (one UPDATE).
2. Write `lib/payments/adapters/stripe-adapter.ts` implementing `PaymentProviderAdapter`'s 5 methods against Stripe's actual API/webhook shapes.
3. Add one line to the registry map in `lib/payments/payment-provider-service.ts`.
4. Update the Super Admin wizard's and tenant Payment Settings' provider-selector to enable the Stripe option (already rendered as a disabled "Coming soon" chip — just needs its `disabled` condition flipped and its own credential-field set, since Stripe's fields differ from Razorpay's key/secret shape).

No changes needed to: `DonationCheckoutService`, `WebhookService`, `CampaignPaymentService`, the public donation page, the receipt pipeline, or any WhatsApp integration — all of them are already written against the provider-agnostic service/interface layer.

## 15. Explicitly Deferred (spec itself marks these "future"/not V1)

QR code on the donation page, email receipts, any provider beyond Razorpay (framework-ready, not built), horizontally-scalable rate limiting (Redis-backed — this app has no Redis anywhere today, so an in-memory single-instance limiter matches current deployment reality), live end-to-end payment testing (no sandbox account in this environment).
