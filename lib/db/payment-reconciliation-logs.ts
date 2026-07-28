import { getPool } from "./pool";
import type { PaymentReconciliationLog } from "@/types/db";

interface PaymentReconciliationLogRow {
  id: string;
  tenant_id: string;
  run_at: Date;
  transactions_checked: number;
  mismatches_found: number;
  auto_resolved: number;
  details: unknown[];
  created_at: Date;
}

function mapLog(row: PaymentReconciliationLogRow): PaymentReconciliationLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    runAt: row.run_at.toISOString(),
    transactionsChecked: row.transactions_checked,
    mismatchesFound: row.mismatches_found,
    autoResolved: row.auto_resolved,
    details: row.details,
    createdAt: row.created_at.toISOString(),
  };
}

export interface RecordReconciliationRunInput {
  tenantId: string;
  transactionsChecked: number;
  mismatchesFound: number;
  autoResolved: number;
  details: unknown[];
}

export async function recordReconciliationRun(input: RecordReconciliationRunInput): Promise<PaymentReconciliationLog> {
  const { rows } = await getPool().query<PaymentReconciliationLogRow>(
    `INSERT INTO payment_reconciliation_logs (tenant_id, transactions_checked, mismatches_found, auto_resolved, details)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING *`,
    [input.tenantId, input.transactionsChecked, input.mismatchesFound, input.autoResolved, JSON.stringify(input.details)],
  );
  return mapLog(rows[0]);
}
