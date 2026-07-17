import { getPool } from "./pool";
import type { WhatsAppAccount, WhatsAppAccountStatus } from "@/types/db";

interface WhatsAppAccountRow {
  id: string;
  tenant_id: string;
  phone_number: string;
  meta_phone_number_id: string;
  meta_business_account_id: string;
  status: WhatsAppAccountStatus;
  connected_at: Date | null;
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
    status: row.status,
    connectedAt: row.connected_at ? row.connected_at.toISOString() : null,
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

/** Manual/operator-managed setup: links a tenant to its Meta WhatsApp phone number. */
export async function upsertWhatsAppAccount(
  tenantId: string,
  input: UpsertWhatsAppAccountInput,
): Promise<WhatsAppAccount> {
  const { rows } = await getPool().query<WhatsAppAccountRow>(
    `INSERT INTO whatsapp_accounts (tenant_id, phone_number, meta_phone_number_id, meta_business_account_id, status, connected_at)
     VALUES ($1, $2, $3, $4, 'connected', now())
     ON CONFLICT (meta_phone_number_id)
     DO UPDATE SET phone_number = EXCLUDED.phone_number,
                   meta_business_account_id = EXCLUDED.meta_business_account_id,
                   status = 'connected',
                   connected_at = now(),
                   updated_at = now()
     RETURNING *`,
    [tenantId, input.phoneNumber, input.metaPhoneNumberId, input.metaBusinessAccountId],
  );
  return mapAccount(rows[0]);
}
