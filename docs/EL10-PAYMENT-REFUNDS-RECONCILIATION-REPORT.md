# TempleOS — Payments: Refunds & Reconciliation

Deliverables for the "Enterprise Multi-Tenant Payment Integration (Backend First)" spec.
The full audit and gap analysis live in
[EL10-PAYMENT-AUDIT-AND-GAP-ANALYSIS.md](./EL10-PAYMENT-AUDIT-AND-GAP-ANALYSIS.md) — that
document found the large majority of this spec's architecture already shipped in an earlier
pass (see [EL10-PAYMENT-PROVIDER-FRAMEWORK-REPORT.md](./EL10-PAYMENT-PROVIDER-FRAMEWORK-REPORT.md)).
This report covers only what was genuinely missing and built now: **refunds** and
**reconciliation**, plus the small additions the gap analysis identified alongside them.

## 1-2. Architecture Audit & Gap Analysis

See the dedicated audit document. Summary: provider abstraction, encrypted credentials, Super
Admin Payment step, tenant connect/disconnect, tokenized donation links, checkout, webhook
signature verification, idempotent capture, receipts, and WhatsApp delivery were **already
implemented**. Refunds, `refund.failed` handling, `payment.link.paid` parsing (dead code today,
added for forward-compatibility only), reconciliation, and a Payment Health dashboard section
were **missing** and are what this pass adds. Four of the spec's requested table names
(`payment_gateway_accounts`, `payment_provider_configs`, `campaign_payment_settings`,
`payment_receipts`) already exist under different names or as plain columns and were
**deliberately not duplicated** — see the audit doc's naming-reconciliation table.

## 3. Backend Design

```
Temple Admin ──POST /api/payments/transactions/[id]/refund──▶ RefundService
                                                                   │
                                                    PaymentProviderService.refundPaymentForTenant
                                                                   │
                                                          RazorpayAdapter.refundPayment
                                                                   │
                                                          Razorpay Refunds API
                                                                   │
                                            (row stored as 'pending' regardless of API response)
                                                                   │
Razorpay ──refund.processed / refund.failed webhook──▶ WebhookService ──▶ CampaignPaymentService.applyRefundEvent
                                                                   │
                                          idempotent CAS on payment_refunds.status
                                                                   │
                                    transaction marked 'refunded' + donor/admin WhatsApp notice
```

```
Railway Cron (nightly) ──▶ /api/cron/reconcile-payments ──▶ ReconciliationService.reconcileAllTenants
                                                                   │
                              per connected tenant: listStaleNonTerminalTransactions (>15 min old)
                                                                   │
                                    RazorpayAdapter.fetchOrderPayment (did Razorpay actually capture it?)
                                                                   │
                              found + not reflected locally → applyPaymentEvent (same path a webhook uses)
                                                                   │
                                          payment_reconciliation_logs row written either way
```

**Key design decision — the refund row is always inserted `pending`, never the provider's
own synchronous status.** Razorpay's refund API often returns `status: "processed"`
synchronously. Storing that directly would make the webhook's idempotent CAS
(`WHERE status <> EXCLUDED.status`) see "already processed" and skip every side effect —
silently never notifying the donor. Forcing `pending` at creation time guarantees the webhook
is the only thing that can ever transition the row, matching this codebase's existing principle
that "the webhook is authoritative, never the synchronous response" (the same reasoning already
applied to checkout's client-side `verify()` call, which never itself creates the donation).

## 4. Database Changes

`migrations/027_payment_refunds_and_reconciliation.sql`:
- `payment_refunds` — one row per refund attempt. `provider_refund_id` is `UNIQUE` (not just
  scoped to the transaction), so the webhook path can `ON CONFLICT (provider_refund_id) DO
  UPDATE` — this also means a refund issued directly in the Razorpay dashboard (bypassing
  TempleOS entirely) still gets captured by the webhook as a fresh row, not silently dropped.
- `payment_reconciliation_logs` — one row per nightly run per tenant, with a JSONB `details`
  array of per-transaction findings.

Both applied successfully against the live/dev database.

## 5. API Endpoints (new)

| Route | Purpose |
|---|---|
| `POST /api/payments/transactions/[id]/refund` | Tenant-admin initiates a full or partial refund |
| `POST /api/cron/reconcile-payments` | Railway Cron — nightly reconciliation across every connected tenant |

## 6. Services Created

| Service | File |
|---|---|
| `RefundService` | `lib/payments/refund-service.ts` |
| `ReconciliationService` | `lib/payments/reconciliation-service.ts` |
| `CampaignPaymentService.applyRefundEvent` | `lib/payments/campaign-payment-service.ts` (added alongside the existing `applyPaymentEvent`, not replacing it) |

`PaymentProviderService` (existing, extended, not duplicated) gained `refundPaymentForTenant` and
`fetchOrderPaymentForTenant` — the same tenant-scoped credential-resolution chokepoint every
other payment operation already goes through.

## 7. Repositories Modified

- `lib/db/payment-refunds.ts` (new) — `createRefund`, `upsertRefundStatusFromWebhook` (idempotent
  CAS upsert), `getTotalRefundedForTransaction`, `getRefundSummaryForTenant`.
- `lib/db/payment-reconciliation-logs.ts` (new) — `recordReconciliationRun`, `getLatestReconciliationRun`.
- `lib/db/payment-transactions.ts` — added `getTransactionByProviderPaymentId` (refund webhooks
  reference the payment id, not the order id) and `listStaleNonTerminalTransactions`.
- `lib/db/tenant-payment-accounts.ts` — added `listActiveConnectedPaymentAccounts` (reconciliation
  needs every connected tenant, not one at a time).
- `lib/payments/provider.ts` — `PaymentProviderAdapter` interface extended with `refundPayment`
  and `fetchOrderPayment`; `PaymentWebhookEventType` extended with `refund.failed` and
  `payment.link.paid`.
- `lib/payments/adapters/razorpay-adapter.ts` — implements the two new methods using the
  `razorpay` package's `payments.refund()`/`orders.fetchPayments()`.

## 8. Migrations Added

`migrations/027_payment_refunds_and_reconciliation.sql` (see §4).

## 9. Razorpay Integration

`refundPayment` calls `client.payments.refund(paymentId, { amount, notes })`, returning
Razorpay's own `id`/`status` (`'pending' | 'processed' | 'failed'` — matches this codebase's
`payment_refunds.status` CHECK constraint values exactly, confirmed against the SDK's type
definitions before writing the migration). `fetchOrderPayment` calls
`client.orders.fetchPayments(orderId)` and checks for any payment in the returned list with
`status === 'captured'`.

## 10. Webhook Flow

`webhook-service.ts` now dispatches by event category instead of a single flat status map:
payment-status events (`authorized`/`captured`/`failed`/`link.paid`) still go through the
existing `applyPaymentEvent` (keyed by order id); refund events (`processed`/`failed`) go
through the new `applyRefundEvent` (keyed by payment id + refund id). Both remain logged
unconditionally to `payment_webhook_logs` before dispatch, exactly as before.

## 11. Receipt Flow

Deliberately **not** extended with a revised/credit-note PDF on refund — see the audit
document's "Scope call" section. The donor is notified via a dedicated WhatsApp message instead;
the transaction and refund records are the source of truth for the amount actually refunded.

## 12. WhatsApp Integration

One new notification type, `payment_refunded`, registered via the existing 3-file pattern
(catalog + notification-template seed + `NotificationType` union entry) — reuses the raw-phone
recipient kind built for `donation_receipt` (donors have no devotee record) and the existing
in-app admin fan-out built for `payment_captured`. No changes to the notification engine, queue,
scheduler, or template registry themselves — purely additive registrations.

## 13. Files Modified/Created

**New (11):** `migrations/027_*.sql`, `lib/db/payment-refunds.ts` (+test), `lib/db/payment-reconciliation-logs.ts`, `lib/payments/refund-service.ts` (+test), `lib/payments/reconciliation-service.ts` (+test), `lib/payments/webhook-service.test.ts`, `app/api/payments/transactions/[id]/refund/route.ts`, `app/api/cron/reconcile-payments/route.ts`, `features/payments/refund-button.tsx`, `docs/EL10-PAYMENT-AUDIT-AND-GAP-ANALYSIS.md`, this report.

**Modified:** `types/db.ts` (`PaymentRefund`, `PaymentReconciliationLog`, `NotificationType`), `lib/payments/provider.ts`, `lib/payments/adapters/razorpay-adapter.ts` (+test additions), `lib/payments/payment-provider-service.ts`, `lib/payments/campaign-payment-service.ts`, `lib/payments/payment-audit.ts`, `lib/db/payment-transactions.ts`, `lib/db/tenant-payment-accounts.ts`, `lib/db/notification-templates.ts`, `lib/whatsapp/standard-template-catalog.ts` (+`template-bootstrap.test.ts` count updates), `app/(dashboard)/dashboard/payments/page.tsx`, `.env.example`, `locales/{en,te}/dashboard.json`.

## 14. Security Review

- Refund initiation is tenant-admin authenticated (`requireTenantAdminSession` + the existing
  `donations` feature gate) — a temple can only refund its own transactions (`transaction.tenantId
  !== tenantId` is checked explicitly, not inferred from the route path alone).
  No rate limiting added to this route — consistent with every other authenticated dashboard
  route in this app (none has it); the two public checkout routes remain the only rate-limited
  surface.
- Over-refunding is blocked server-side (`amount > transaction.amount - alreadyRefunded` check) —
  never trusts a client-supplied amount without validation.
- Refund and reconciliation webhook paths reuse the exact same signature-verification and
  idempotent-CAS machinery already audited for payment capture — no new trust boundary
  introduced.
- Every refund initiation, failure, and reconciliation run with findings is audit-logged via the
  existing `audit_log` table (`payment_refund.initiated`, `payment_refund.failed`,
  `payment_reconciliation.run_completed`).

## 15. Testing Report

`npx tsc --noEmit` clean. `npx eslint .` clean (one pre-existing, unrelated warning in
`metric-card.tsx` from a concurrent session's commit, not touched by this work).
`npx vitest run` — **642/642 passing** (21 new tests across 5 new/extended test files):
credential/idempotency coverage for `upsertRefundStatusFromWebhook` and
`getTotalRefundedForTransaction`; `RefundService`'s validation branches (wrong tenant, not
captured, exceeds balance, no provider connected, and the critical "always stores 'pending'"
behavior); `ReconciliationService`'s three cases (no mismatch, auto-resolved mismatch, no
audit-log noise on a clean run) plus the multi-tenant loop; webhook dispatch routing (payment vs.
refund events, including the `payment.link.paid` → captured mapping, and that an invalid
signature short-circuits both paths); `refund.failed`/`payment_link.paid` event parsing. `npm run
build` — zero errors, both new routes (`/api/cron/reconcile-payments`,
`/api/payments/transactions/[id]/refund`) confirmed present in the route listing.

**Cannot be verified from this environment** (no live Razorpay sandbox account): an actual
refund call against Razorpay, a real `refund.processed`/`refund.failed` webhook delivery, and the
reconciliation job actually detecting a genuinely missed webhook against live data. Same
disclosed limitation as the original payment framework report.

## 16. Future Provider Extension Guide

Unchanged from the original framework: adding Stripe/Cashfree/PhonePe/PayU means writing one new
adapter file implementing all 7 `PaymentProviderAdapter` methods (5 from the original framework +
the 2 added in this pass) and one registry entry in `payment-provider-service.ts`. Refunds and
reconciliation need zero changes anywhere else — `RefundService` and `ReconciliationService` both
already call through `PaymentProviderService`, never a concrete adapter.
