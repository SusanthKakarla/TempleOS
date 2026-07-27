import { getPool } from "./pool";
import type { PaymentWebhookLog } from "@/types/db";

interface PaymentWebhookLogRow {
  id: string;
  tenant_id: string | null;
  provider_key: string;
  signature_valid: boolean;
  event_type: string | null;
  error_message: string | null;
  created_at: Date;
}

function mapLog(row: PaymentWebhookLogRow): PaymentWebhookLog {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    providerKey: row.provider_key,
    signatureValid: row.signature_valid,
    eventType: row.event_type,
    errorMessage: row.error_message,
    createdAt: row.created_at.toISOString(),
  };
}

export interface LogPaymentWebhookInput {
  tenantId: string | null;
  providerKey: string;
  signatureValid: boolean;
  eventType: string | null;
  rawBody: string;
  errorMessage: string | null;
}

/** Logs every inbound webhook hit unconditionally — valid or not, recognized or not — the operational/security audit trail this class of endpoint needs. */
export async function logPaymentWebhook(input: LogPaymentWebhookInput): Promise<PaymentWebhookLog> {
  const { rows } = await getPool().query<PaymentWebhookLogRow>(
    `INSERT INTO payment_webhook_logs (tenant_id, provider_key, signature_valid, event_type, raw_body, error_message)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, tenant_id, provider_key, signature_valid, event_type, error_message, created_at`,
    [input.tenantId, input.providerKey, input.signatureValid, input.eventType, input.rawBody, input.errorMessage],
  );
  return mapLog(rows[0]);
}
