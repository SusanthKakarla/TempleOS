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
  is_anonymous: boolean;
  receipt_number: string | null;
  receipt_url: string | null;
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
    isAnonymous: row.is_anonymous,
    receiptNumber: row.receipt_number,
    receiptUrl: row.receipt_url,
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
  isAnonymous: boolean;
}

export async function createPaymentTransaction(input: CreatePaymentTransactionInput): Promise<PaymentTransaction> {
  const { rows } = await getPool().query<PaymentTransactionRow>(
    `INSERT INTO payment_transactions
       (tenant_id, payment_account_id, campaign_id, provider_key, provider_order_id, amount, currency,
        donor_name, donor_phone, donor_email, is_anonymous)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      input.isAnonymous,
    ],
  );
  return mapTransaction(rows[0]);
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
  input: { donationId: string; receiptNumber: string; receiptUrl: string },
  client: QueryClient = getPool(),
): Promise<void> {
  await client.query(
    `UPDATE payment_transactions
     SET donation_id = $2, receipt_number = $3, receipt_url = $4, updated_at = now()
     WHERE id = $1`,
    [id, input.donationId, input.receiptNumber, input.receiptUrl],
  );
}

export interface ListTransactionsFilters {
  page: number;
  pageSize: number;
  status?: PaymentTransactionStatus;
}

export async function listTransactionsForTenant(
  tenantId: string,
  filters: ListTransactionsFilters,
): Promise<{ transactions: PaymentTransaction[]; totalCount: number }> {
  const conditions = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];
  if (filters.status) {
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  }
  const whereClause = conditions.join(" AND ");
  const offset = (filters.page - 1) * filters.pageSize;

  const [{ rows }, countResult] = await Promise.all([
    getPool().query<PaymentTransactionRow>(
      `SELECT * FROM payment_transactions WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, filters.pageSize, offset],
    ),
    getPool().query<{ count: string }>(`SELECT count(*) FROM payment_transactions WHERE ${whereClause}`, params),
  ]);

  return { transactions: rows.map(mapTransaction), totalCount: Number(countResult.rows[0].count) };
}

export interface PaymentDashboardSummary {
  todayTotal: number;
  todayCount: number;
  campaignRevenueTotal: number;
  failedCount: number;
  pendingCount: number;
}

export async function getPaymentDashboardSummary(tenantId: string): Promise<PaymentDashboardSummary> {
  const { rows } = await getPool().query<{
    today_total: string | null;
    today_count: string;
    campaign_revenue_total: string | null;
    failed_count: string;
    pending_count: string;
  }>(
    `SELECT
       (SELECT COALESCE(sum(amount), 0) FROM payment_transactions WHERE tenant_id = $1 AND status = 'captured' AND created_at >= date_trunc('day', now())) AS today_total,
       (SELECT count(*) FROM payment_transactions WHERE tenant_id = $1 AND status = 'captured' AND created_at >= date_trunc('day', now())) AS today_count,
       (SELECT COALESCE(sum(amount), 0) FROM payment_transactions WHERE tenant_id = $1 AND status = 'captured' AND campaign_id IS NOT NULL) AS campaign_revenue_total,
       (SELECT count(*) FROM payment_transactions WHERE tenant_id = $1 AND status = 'failed') AS failed_count,
       (SELECT count(*) FROM payment_transactions WHERE tenant_id = $1 AND status IN ('created', 'authorized')) AS pending_count`,
    [tenantId],
  );
  const row = rows[0];
  return {
    todayTotal: Number(row.today_total ?? 0),
    todayCount: Number(row.today_count),
    campaignRevenueTotal: Number(row.campaign_revenue_total ?? 0),
    failedCount: Number(row.failed_count),
    pendingCount: Number(row.pending_count),
  };
}
