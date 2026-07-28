# TempleOS — Payment Infrastructure Audit & Gap Analysis

Phase 1-2 deliverable for the "Enterprise Multi-Tenant Payment Integration" spec. This audit
found that the large majority of the requested architecture **already exists**, built and
shipped earlier in this same project (migrations 025/026, `lib/payments/**`, `lib/receipts/**`,
6 API routes, the Super Admin Payment step, tenant Payment Settings + Payments dashboard, the
public donation checkout page). This document inventories what exists, maps the spec's requested
table/service names onto the already-shipped equivalents (to avoid duplicating them under a new
name), and identifies the genuine gaps — which turn out to be **refunds** and **reconciliation**,
plus a handful of small additions. Only those gaps are implemented in this pass.

## Phase 1 — Architecture Audit (file-by-file)

| File | Purpose | Status |
|---|---|---|
| `migrations/025_payment_provider_framework.sql` | `payment_providers`, `tenant_payment_accounts`, `tenant_payment_credentials`, `payment_transactions`, `payment_webhook_logs`, `campaigns.slug`/`donation_token`, `donations.payment_method` widened | **Used, unchanged.** Reused as-is. |
| `migrations/026_notification_raw_phone_recipient.sql` | `notifications.recipient_phone` — lets a WhatsApp receipt reach a checkout donor with no devotee record | **Used, unchanged.** |
| `lib/payments/crypto.ts` | AES-256-GCM encrypt/decrypt for stored credentials | **Used, unchanged.** |
| `lib/payments/provider.ts` | `PaymentProviderAdapter` interface (the provider abstraction) | **Needs modification** — add `refundPayment`/`fetchPayment` methods for Phase 13/14. |
| `lib/payments/adapters/razorpay-adapter.ts` | Razorpay implementation of the adapter | **Needs modification** — same two new methods. |
| `lib/payments/payment-provider-service.ts` | The one chokepoint resolving a tenant's active provider + adapter | **Needs modification** — expose the two new adapter capabilities tenant-scoped. |
| `lib/payments/donation-checkout-service.ts` | Public checkout order creation | **Used, unchanged.** |
| `lib/payments/webhook-service.ts` | Signature verification + event dispatch | **Needs modification** — dispatch refund events to a new handler; add `refund.failed`/`payment.link.paid` parsing. |
| `lib/payments/campaign-payment-service.ts` | `applyPaymentEvent` — idempotent capture, donation/receipt/notification side effects | **Needs modification** — add `applyRefundEvent` alongside (not replacing) `applyPaymentEvent`. |
| `lib/payments/payment-audit.ts` | Thin wrapper over the existing `audit_log` table | **Needs modification** — add refund/reconciliation audit actions. |
| `lib/payments/rate-limit.ts` | In-memory limiter for the two public donation routes | **Used, unchanged.** Not extended to the new admin-only refund route (matches existing precedent: authenticated dashboard routes aren't rate-limited anywhere in this app). |
| `lib/receipts/receipt-pdf.ts` / `receipt-service.ts` | PDF generation + ImageKit storage + receipt numbering | **Used, unchanged.** Reused for refund notifications too (no new PDF regenerated on refund — see Gap Analysis). |
| `lib/db/tenant-payment-accounts.ts` | Connect/disconnect, credential storage/decryption | **Used, unchanged.** This **is** the spec's requested `payment_gateway_accounts`/`payment_provider_configs` — see naming note below. |
| `lib/db/payment-transactions.ts` | Transaction CRUD, idempotent capture (state-transition CAS) | **Needs modification** — add `getTransactionByProviderPaymentId` (refunds reference `payment_id`, not `order_id`). |
| `lib/db/payment-webhook-logs.ts` | Raw webhook audit trail | **Used, unchanged.** |
| API: `app/api/payments/accounts[/[id]]`, `app/api/payments/transactions`, `app/api/public/donate/**`, `app/api/webhooks/razorpay/[tenantId]` | Connect/disconnect, transactions list, public checkout, webhook receiver | **Used, unchanged**, except the webhook route's underlying service gets the refund dispatch addition (route file itself doesn't change). |
| Super Admin: `features/super-admin/new-temple-form.tsx` + `new-temple-form-helpers.ts` + `lib/provisioning/temples.ts` | Payment Integration step between WhatsApp and Feature Access | **Already matches Phase 4 exactly.** Provisioning Summary already sits full-width below the wizard (fixed in an earlier pass). No changes. |
| `app/(dashboard)/dashboard/settings/payments/page.tsx`, `features/payments/razorpay-connection-card.tsx` | Tenant-admin connect/disconnect UI | **Used, unchanged.** |
| `app/(dashboard)/dashboard/payments/page.tsx` | Metrics + transactions table | **Needs modification** — add a "Payment Health" section (Phase 15) and a per-row Refund action. |
| `app/(donate)/donate/[tenantSlug]/[campaignSlug]/[token]/page.tsx` + `features/payments/donation-checkout-form.tsx` | Public checkout page | **Used, unchanged.** |
| `lib/whatsapp/standard-template-catalog.ts` + `lib/db/notification-templates.ts` | `donation_receipt` (donor-facing) and `payment_captured` (admin in-app) notification types | **Used, unchanged.** One new type added for refunds — see Gap Analysis. |
| Cron infra: `lib/cron/auth.ts`, `lib/cron/log-run.ts`, 4 existing cron routes | Shared cron auth/logging pattern | **Reused, unchanged** for the new reconciliation cron. |

## Naming reconciliation (spec's requested names vs. what already exists)

The spec asks to create these tables "if missing." Four of the eight **already exist under a
different name** from the earlier build — creating duplicates under the spec's literal names
would violate the spec's own "do not duplicate" instruction, so they are **not** recreated:

| Spec's requested name | Already exists as | Decision |
|---|---|---|
| `payment_gateway_accounts` | `tenant_payment_accounts` | Reuse existing — same concept (one connected provider per tenant). |
| `payment_provider_configs` | `payment_providers` (static catalog) + `tenant_payment_credentials` (per-tenant secrets) | Reuse existing — same concept split the same way the spec's own Phase 6 already implies (catalog vs. credentials). |
| `campaign_payment_settings` | `campaigns.goal_amount` / `campaign_start_date` / `campaign_end_date` / `donation_link_override` / `linked_donation_purpose` / `slug` / `donation_token` (plain columns) | Not created — these are already first-class campaign columns; a parallel settings table would duplicate them. |
| `payment_receipts` | `payment_transactions.receipt_number` / `receipt_url` | Not created as a separate table — see Gap Analysis for why a full receipt-history table isn't needed for V1 refunds. |

Genuinely new tables (below) use the spec's literal names since nothing already covers them.

## Phase 2 — Gap Analysis

| Capability | Status | Notes |
|---|---|---|
| Provider abstraction, Razorpay adapter, encrypted credentials | **Already implemented** | |
| Super Admin Payment Integration step | **Already implemented** | |
| Tenant connect/disconnect UI | **Already implemented** | |
| Secure tokenized donation links | **Already implemented** | `donation_token`, constant-time compared |
| Order creation, Checkout launch | **Already implemented** | |
| Webhook signature verification | **Already implemented** | HMAC + `timingSafeEqual`, not the SDK's non-constant-time helper |
| Idempotent payment capture | **Already implemented** | State-transition CAS, not event-id dedup |
| Donation + campaign progress update on capture | **Already implemented** | Reuses the existing manual-donor donation shape and the existing live-derived `getCampaignDonationSummary` |
| Receipt PDF generation + storage | **Already implemented** | |
| WhatsApp receipt delivery | **Already implemented** | Required extending the notification engine with a raw-phone recipient kind (donors have no devotee record) — done in an earlier pass |
| In-app "payment captured" dashboard notification | **Already implemented** | |
| Payments dashboard (revenue, pending, failed, transactions) | **Already implemented** | |
| Rate limiting on public routes | **Already implemented** | |
| **Refunds** (admin-initiated + webhook-confirmed) | **Missing** | Built in this pass |
| **`payment_refunds` table** | **Missing** | Built in this pass |
| **`refund.failed` event handling** | **Missing** | `refund.processed` existed generically; `refund.failed` and per-refund-row tracking did not |
| **`payment.link.paid` parsing** | **Missing, and N/A to current architecture** | This app never creates Razorpay Payment Links (it uses Orders + Checkout.js) — parsing added for forward-compatibility only, dead code today, documented as such |
| **Reconciliation job + `payment_reconciliation_logs`** | **Missing** | Built in this pass |
| **"Payment Health" dashboard section** | **Missing** | Built in this pass (connection status + last reconciliation + refund summary) |
| Receipt regeneration on refund (a revised/credit-note PDF) | **Deliberately not built** | Scope call — see below |
| Rate limiting on the new refund route | **Deliberately not built** | It's an authenticated tenant-admin route; no existing dashboard route in this app has rate limiting either — consistent, not a regression |

**Scope call — receipt regeneration on refund:** Phase 13's diagram shows "Receipt Updated" after
a refund. Building a full revised/credit-note PDF pipeline (re-render, re-upload, re-point) is a
meaningfully larger feature than what "notify the donor a refund happened" requires. This pass
instead sends a dedicated WhatsApp notification (`payment_refunded`) confirming the refund amount
and referencing the original receipt number — the donor is informed, and the dashboard/API
surface the refund's own record — without inventing a second receipt-versioning subsystem. Full
PDF regeneration is called out as a future improvement, not silently skipped.
