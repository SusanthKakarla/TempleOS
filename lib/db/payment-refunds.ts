import { getPool } from "./pool";
import type { PaymentRefund, PaymentRefundStatus } from "@/types/db";

interface PaymentRefundRow {
  id: string;
  tenant_id: string;
  transaction_id: string;
  provider_refund_id: string | null;
  amount: string;
  status: PaymentRefundStatus;
  reason: string | null;
  initiated_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapRefund(row: PaymentRefundRow): PaymentRefund {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    transactionId: row.transaction_id,
    providerRefundId: row.provider_refund_id,
    amount: Number(row.amount),
    status: row.status,
    reason: row.reason,
    initiatedBy: row.initiated_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Idempotent by provider_refund_id: updates a matching pending row's status,
 * or inserts a fresh row if none exists (an externally-initiated refund —
 * issued directly in the Razorpay dashboard, bypassing TempleOS). Returns
 * null when the row is already in the target status (redelivered webhook —
 * no-op, callers skip side effects).
 */
export async function upsertRefundStatusFromWebhook(
  tenantId: string,
  transactionId: string,
  providerRefundId: string,
  amount: number,
  status: PaymentRefundStatus,
): Promise<PaymentRefund | null> {
  const { rows } = await getPool().query<PaymentRefundRow>(
    `INSERT INTO payment_refunds (tenant_id, transaction_id, provider_refund_id, amount, status)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (provider_refund_id) DO UPDATE
       SET status = EXCLUDED.status, updated_at = now()
       WHERE payment_refunds.status <> EXCLUDED.status
     RETURNING *`,
    [tenantId, transactionId, providerRefundId, amount, status],
  );
  return rows[0] ? mapRefund(rows[0]) : null;
}

