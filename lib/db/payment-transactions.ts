import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import type { PaymentProviderKey, PaymentTransaction, PaymentTransactionStatus } from "@/types/db";

interface PaymentTransactionRow {
  id: string;
  tenant_id: string;
  payment_account_id: string;
  campaign_id: string | null;
  donation_id: string | null;
  provider_key: PaymentProviderKey;
  provider_order_id: string;
  provider_payment_id: string | null;
  amount: string;
  currency: string;
  status: PaymentTransactionStatus;
  donor_name: string;
  donor_phone: string | null;
  donor_email: string | null;
  donor_pan: string | null;
  donor_message: string | null;
  is_anonymous: boolean;
  receipt_number: string | null;
  receipt_url: string | null;
  upi_reference: string | null;
  payment_screenshot_url: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapTransaction(row: PaymentTransactionRow): PaymentTransaction {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    paymentAccountId: row.payment_account_id,
    campaignId: row.campaign_id,
    donationId: row.donation_id,
    providerKey: row.provider_key,
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    donorName: row.donor_name,
    donorPhone: row.donor_phone,
    donorEmail: row.donor_email,
    donorPan: row.donor_pan,
    donorMessage: row.donor_message,
    isAnonymous: row.is_anonymous,
    receiptNumber: row.receipt_number,
    receiptUrl: row.receipt_url,
    upiReference: row.upi_reference,
    paymentScreenshotUrl: row.payment_screenshot_url,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface CreatePaymentTransactionInput {
  tenantId: string;
  paymentAccountId: string;
  campaignId: string | null;
  providerKey: PaymentProviderKey;
  providerOrderId: string;
  amount: number;
  currency: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorPan: string | null;
  donorMessage: string | null;
  isAnonymous: boolean;
}

export async function createPaymentTransaction(input: CreatePaymentTransactionInput): Promise<PaymentTransaction> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    `INSERT INTO payment_transactions
       (tenant_id, payment_account_id, campaign_id, provider_key, provider_order_id, amount, currency,
        donor_name, donor_phone, donor_email, donor_pan, donor_message, is_anonymous)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      input.tenantId,
      input.paymentAccountId,
      input.campaignId,
      input.providerKey,
      input.providerOrderId,
      input.amount,
      input.currency,
      input.donorName,
      input.donorPhone,
      input.donorEmail,
      input.donorPan,
      input.donorMessage,
      input.isAnonymous,
    ],
  );
  return mapTransaction(rows[0]);
}

export interface CreatePendingUpiTransactionInput {
  tenantId: string;
  paymentAccountId: string;
  campaignId: string | null;
  providerOrderId: string;
  amount: number;
  currency: string;
  donorName: string;
  donorPhone: string | null;
  donorEmail: string | null;
  donorPan: string | null;
  donorMessage: string | null;
  isAnonymous: boolean;
}

/**
 * upi_manual has no real gateway order to create, so this inserts directly
 * with `status: 'pending_verification'` instead of the DB-default 'created'
 * — there is no "authorized"/"captured" webhook lifecycle to move through,
 * only a human admin decision (approve → 'captured', reject → 'failed').
 */
export async function createPendingUpiTransaction(input: CreatePendingUpiTransactionInput): Promise<PaymentTransaction> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    `INSERT INTO payment_transactions
       (tenant_id, payment_account_id, campaign_id, provider_key, provider_order_id, amount, currency,
        donor_name, donor_phone, donor_email, donor_pan, donor_message, is_anonymous, status)
     VALUES ($1, $2, $3, 'upi_manual', $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending_verification')
     RETURNING *`,
    [
      input.tenantId,
      input.paymentAccountId,
      input.campaignId,
      input.providerOrderId,
      input.amount,
      input.currency,
      input.donorName,
      input.donorPhone,
      input.donorEmail,
      input.donorPan,
      input.donorMessage,
      input.isAnonymous,
    ],
  );
  return mapTransaction(rows[0]);
}

/** Devotee's optional post-payment self-report (UPI reference / screenshot) — status stays `pending_verification`, only these two fields change. */
export async function attachUpiConfirmationProof(
  id: string,
  input: { upiReference: string | null; paymentScreenshotUrl: string | null },
): Promise<PaymentTransaction | null> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    `UPDATE payment_transactions
     SET upi_reference = COALESCE($2, upi_reference), payment_screenshot_url = COALESCE($3, payment_screenshot_url), updated_at = now()
     WHERE id = $1 AND provider_key = 'upi_manual' AND status = 'pending_verification'
     RETURNING *`,
    [id, input.upiReference, input.paymentScreenshotUrl],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export interface PendingUpiDonation extends PaymentTransaction {
  campaignTitle: string | null;
}

/** The Pending Donations admin queue — every upi_manual transaction still awaiting a human decision, newest first. */
export async function listPendingUpiDonations(tenantId: string): Promise<PendingUpiDonation[]> {
  const { rows } = await getPool().query<PaymentTransactionRow & { campaign_title: string | null }>(
    `SELECT t.*, c.title AS campaign_title
     FROM payment_transactions t
     LEFT JOIN campaigns c ON c.id = t.campaign_id
     WHERE t.tenant_id = $1 AND t.provider_key = 'upi_manual' AND t.status = 'pending_verification'
     ORDER BY t.created_at DESC`,
    [tenantId],
  );
  return rows.map((row) => ({ ...mapTransaction(row), campaignTitle: row.campaign_title }));
}

export async function getTransactionByProviderOrderId(
  paymentAccountId: string,
  providerOrderId: string,
): Promise<PaymentTransaction | null> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    "SELECT * FROM payment_transactions WHERE payment_account_id = $1 AND provider_order_id = $2",
    [paymentAccountId, providerOrderId],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function getPaymentTransactionById(id: string): Promise<PaymentTransaction | null> {
  const { rows } = await getPool().query<PaymentTransactionRow>("SELECT * FROM payment_transactions WHERE id = $1", [id]);
  return rows[0] ? mapTransaction(rows[0]) : null;
}

/** Refund webhook events reference the payment id, not the order id — this is the lookup that path needs. */
export async function getTransactionByProviderPaymentId(
  paymentAccountId: string,
  providerPaymentId: string,
): Promise<PaymentTransaction | null> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    "SELECT * FROM payment_transactions WHERE payment_account_id = $1 AND provider_payment_id = $2",
    [paymentAccountId, providerPaymentId],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

/** For reconciliation: transactions stuck in a non-terminal state past a safety window (avoids false positives on payments still genuinely in flight). */
export async function listStaleNonTerminalTransactions(
  tenantId: string,
  olderThanMinutes: number,
): Promise<PaymentTransaction[]> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    `SELECT * FROM payment_transactions
     WHERE tenant_id = $1 AND status IN ('created', 'authorized') AND provider_key <> 'upi_manual'
       AND created_at < now() - ($2 || ' minutes')::interval
     ORDER BY created_at ASC`,
    [tenantId, olderThanMinutes],
  );
  return rows.map(mapTransaction);
}

/**
 * A transaction can reach `captured` (via markTransactionCapturedIfNotAlready)
 * and then have its donation/receipt creation fail before completing —
 * e.g. a transient ImageKit/DB error mid-way through runCaptureSideEffects.
 * Once that CAS has flipped status to 'captured', a redelivered webhook
 * event is a no-op (by design, to stay idempotent), so nothing else will
 * ever retry it. Reconciliation uses this to find and re-run those stuck
 * transactions — the same self-healing role listStaleNonTerminalTransactions
 * plays for a missed webhook, just for a different failure point.
 */
export async function listCapturedTransactionsMissingDonation(
  tenantId: string,
  olderThanMinutes: number,
): Promise<PaymentTransaction[]> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    `SELECT * FROM payment_transactions
     WHERE tenant_id = $1 AND status = 'captured' AND donation_id IS NULL
       AND updated_at < now() - ($2 || ' minutes')::interval
     ORDER BY updated_at ASC`,
    [tenantId, olderThanMinutes],
  );
  return rows.map(mapTransaction);
}

/** Plain (non-idempotent) status update — used for authorized/failed/refunded, which have no further side effects requiring dedup. */
export async function updateTransactionStatus(
  id: string,
  status: PaymentTransactionStatus,
  providerPaymentId: string | null,
): Promise<PaymentTransaction | null> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    `UPDATE payment_transactions
     SET status = $2, provider_payment_id = COALESCE($3, provider_payment_id), updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status, providerPaymentId],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

/**
 * Idempotent capture: only transitions rows that are NOT already 'captured'.
 * A Razorpay webhook redelivery of the same "payment.captured" event finds
 * zero matching rows the second time — the caller uses that (not any event
 * id) to decide whether to run capture side effects (donation creation,
 * receipt, WhatsApp send) at all.
 */
export async function markTransactionCapturedIfNotAlready(
  id: string,
  providerPaymentId: string,
  client: QueryClient = getPool(),
): Promise<PaymentTransaction | null> {
  const { rows } = await client.query<PaymentTransactionRow>(
    `UPDATE payment_transactions
     SET status = 'captured', provider_payment_id = $2, updated_at = now()
     WHERE id = $1 AND status <> 'captured'
     RETURNING *`,
    [id, providerPaymentId],
  );
  return rows[0] ? mapTransaction(rows[0]) : null;
}

export async function attachDonationAndReceipt(
  id: string,
  /** `receiptNumber`/`receiptUrl` are null for the upi_manual admin-approval path, which deliberately skips automatic receipt generation for V0 — every other caller still passes real values. */
  input: { donationId: string; receiptNumber: string | null; receiptUrl: string | null },
  client: QueryClient = getPool(),
): Promise<void> {
  await client.query(
    `UPDATE payment_transactions
     SET donation_id = $2, receipt_number = $3, receipt_url = $4, updated_at = now()
     WHERE id = $1`,
    [id, input.donationId, input.receiptNumber, input.receiptUrl],
  );
}

