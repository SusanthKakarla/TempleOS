import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import type { WhatsAppAccount, WhatsAppAccountStatus } from "@/types/db";

interface WhatsAppAccountRow {
  id: string;
  tenant_id: string;
  phone_number: string;
  meta_phone_number_id: string;
  meta_business_account_id: string;
  business_name: string | null;
  phone_verification_status: string | null;
  webhook_subscribed: boolean;
  status: WhatsAppAccountStatus;
  connected_at: Date | null;
  disconnected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapAccount(row: WhatsAppAccountRow): WhatsAppAccount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    phoneNumber: row.phone_number,
    metaPhoneNumberId: row.meta_phone_number_id,
    metaBusinessAccountId: row.meta_business_account_id,
    businessName: row.business_name,
    phoneVerificationStatus: row.phone_verification_status,
    webhookSubscribed: row.webhook_subscribed,
    status: row.status,
    connectedAt: row.connected_at ? row.connected_at.toISOString() : null,
    disconnectedAt: row.disconnected_at ? row.disconnected_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getWhatsAppAccountByPhoneNumberId(
  metaPhoneNumberId: string,
): Promise<WhatsAppAccount | null> {
  const { rows } = await getPool().query<WhatsAppAccountRow>(
    "SELECT * FROM whatsapp_accounts WHERE meta_phone_number_id = $1",
    [metaPhoneNumberId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function getWhatsAppAccountByTenant(tenantId: string): Promise<WhatsAppAccount | null> {
  const { rows } = await getPool().query<WhatsAppAccountRow>(
    "SELECT * FROM whatsapp_accounts WHERE tenant_id = $1",
    [tenantId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export interface UpsertWhatsAppAccountInput {
  phoneNumber: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
}

export interface LinkWhatsAppAccountForProvisioningInput extends UpsertWhatsAppAccountInput {
  tenantId: string;
}

export interface ManuallyConnectWhatsAppAccountInput extends UpsertWhatsAppAccountInput {
  businessName?: string | null;
  webhookSubscribed: boolean;
}

export async function linkWhatsAppAccountForProvisioning(
  input: LinkWhatsAppAccountForProvisioningInput,
  client: QueryClient = getPool(),
): Promise<WhatsAppAccount> {
  const { rows } = await client.query<WhatsAppAccountRow>(
    `INSERT INTO whatsapp_accounts (tenant_id, phone_number, meta_phone_number_id, meta_business_account_id, status, connected_at)
     VALUES ($1, $2, $3, $4, 'connected', now())
     RETURNING *`,
    [input.tenantId, input.phoneNumber, input.metaPhoneNumberId, input.metaBusinessAccountId],
  );
  return mapAccount(rows[0]);
}

/** Manual/operator-managed setup: Super Admin links (or updates) a tenant's Meta WhatsApp phone number directly, bypassing Embedded Signup. */
export async function manuallyConnectWhatsAppAccount(
  tenantId: string,
  input: ManuallyConnectWhatsAppAccountInput,
): Promise<WhatsAppAccount> {
  const { rows } = await getPool().query<WhatsAppAccountRow>(
    `INSERT INTO whatsapp_accounts (tenant_id, phone_number, meta_phone_number_id, meta_business_account_id, business_name, webhook_subscribed, status, connected_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'connected', now())
     ON CONFLICT (tenant_id)
     DO UPDATE SET phone_number = EXCLUDED.phone_number,
                   meta_phone_number_id = EXCLUDED.meta_phone_number_id,
                   meta_business_account_id = EXCLUDED.meta_business_account_id,
                   business_name = EXCLUDED.business_name,
                   webhook_subscribed = EXCLUDED.webhook_subscribed,
                   status = 'connected',
                   connected_at = now(),
                   disconnected_at = NULL,
                   updated_at = now()
     RETURNING *`,
    [
      tenantId,
      input.phoneNumber,
      input.metaPhoneNumberId,
      input.metaBusinessAccountId,
      input.businessName ?? null,
      input.webhookSubscribed,
    ],
  );
  return mapAccount(rows[0]);
}

/** Super Admin hard-delete — fully removes the mapping row (unlike disconnectWhatsAppAccount's soft-disconnect). Caller is responsible for audit-logging before invoking this, since the row (and its identifying fields) won't exist afterward. */
export async function deleteWhatsAppAccount(tenantId: string): Promise<WhatsAppAccount | null> {
  const { rows } = await getPool().query<WhatsAppAccountRow>(
    "DELETE FROM whatsapp_accounts WHERE tenant_id = $1 RETURNING *",
    [tenantId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export interface CompleteEmbeddedSignupInput {
  phoneNumber: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
  businessName: string | null;
  phoneVerificationStatus: string | null;
  webhookSubscribed: boolean;
}

/** Self-service setup via Meta Embedded Signup — also used for Reconnect (same upsert shape). */
export async function completeEmbeddedSignup(
  tenantId: string,
  input: CompleteEmbeddedSignupInput,
): Promise<WhatsAppAccount> {
  const { rows } = await getPool().query<WhatsAppAccountRow>(
    `INSERT INTO whatsapp_accounts (
       tenant_id, phone_number, meta_phone_number_id, meta_business_account_id,
       business_name, phone_verification_status, webhook_subscribed, status, connected_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'connected', now())
     ON CONFLICT (tenant_id)
     DO UPDATE SET phone_number = EXCLUDED.phone_number,
                   meta_phone_number_id = EXCLUDED.meta_phone_number_id,
                   meta_business_account_id = EXCLUDED.meta_business_account_id,
                   business_name = EXCLUDED.business_name,
                   phone_verification_status = EXCLUDED.phone_verification_status,
                   webhook_subscribed = EXCLUDED.webhook_subscribed,
                   status = 'connected',
                   connected_at = now(),
                   disconnected_at = NULL,
                   updated_at = now()
     RETURNING *`,
    [
      tenantId,
      input.phoneNumber,
      input.metaPhoneNumberId,
      input.metaBusinessAccountId,
      input.businessName,
      input.phoneVerificationStatus,
      input.webhookSubscribed,
    ],
  );
  return mapAccount(rows[0]);
}

/** Soft-disconnect — preserves phone/business identifiers and connectedAt for history; message history is tenant-scoped, never touched here. */
export async function disconnectWhatsAppAccount(tenantId: string): Promise<WhatsAppAccount | null> {
  const { rows } = await getPool().query<WhatsAppAccountRow>(
    `UPDATE whatsapp_accounts
     SET status = 'disconnected',
         disconnected_at = now(),
         webhook_subscribed = false,
         updated_at = now()
     WHERE tenant_id = $1
     RETURNING *`,
    [tenantId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}
