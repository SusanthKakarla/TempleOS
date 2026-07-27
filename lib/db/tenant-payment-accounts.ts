import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import type { PaymentProviderKey, TenantPaymentAccount } from "@/types/db";
import { encryptSecret, decryptSecret } from "@/lib/payments/crypto";
import type { DecryptedCredentials } from "@/lib/payments/provider";

interface PaymentAccountRow {
  id: string;
  tenant_id: string;
  provider_key: PaymentProviderKey;
  business_name: string;
  merchant_name: string;
  contact_email: string;
  contact_phone: string;
  status: "connected" | "disabled";
  is_active: boolean;
  last_validated_at: Date | null;
  last_validation_error: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapAccount(row: PaymentAccountRow): TenantPaymentAccount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    providerKey: row.provider_key,
    businessName: row.business_name,
    merchantName: row.merchant_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    status: row.status,
    isActive: row.is_active,
    lastValidatedAt: row.last_validated_at ? row.last_validated_at.toISOString() : null,
    lastValidationError: row.last_validation_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function getActivePaymentAccountForTenant(tenantId: string): Promise<TenantPaymentAccount | null> {
  const { rows } = await getPool().query<PaymentAccountRow>(
    "SELECT * FROM tenant_payment_accounts WHERE tenant_id = $1 AND is_active = true",
    [tenantId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export interface PaymentAccountCredentialsInput {
  providerKey: PaymentProviderKey;
  keyId: string;
  keySecret: string;
  webhookSecret: string | null;
  businessName: string;
  merchantName: string;
  contactEmail: string;
  contactPhone: string;
}

/** Provisioning-time link (new tenant, no prior payment account to deactivate) — mirrors `linkWhatsAppAccountForProvisioning`. */
export async function linkPaymentAccountForProvisioning(
  tenantId: string,
  input: PaymentAccountCredentialsInput,
  client: QueryClient,
): Promise<TenantPaymentAccount> {
  const { rows } = await client.query<PaymentAccountRow>(
    `INSERT INTO tenant_payment_accounts
       (tenant_id, provider_key, business_name, merchant_name, contact_email, contact_phone, status, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, 'connected', true)
     RETURNING *`,
    [tenantId, input.providerKey, input.businessName, input.merchantName, input.contactEmail, input.contactPhone],
  );
  const account = mapAccount(rows[0]);
  await client.query(
    `INSERT INTO tenant_payment_credentials (payment_account_id, key_id, encrypted_key_secret, encrypted_webhook_secret)
     VALUES ($1, $2, $3, $4)`,
    [account.id, input.keyId, encryptSecret(input.keySecret), input.webhookSecret ? encryptSecret(input.webhookSecret) : null],
  );
  return account;
}

/** Tenant-admin self-service connect (Payment Settings page) — deactivates any prior active account for this tenant first, since only one may be active. */
export async function connectPaymentAccount(
  tenantId: string,
  input: PaymentAccountCredentialsInput,
): Promise<TenantPaymentAccount> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE tenant_payment_accounts SET is_active = false, updated_at = now() WHERE tenant_id = $1 AND is_active = true",
      [tenantId],
    );
    const account = await linkPaymentAccountForProvisioning(tenantId, input, client);
    await client.query("COMMIT");
    return account;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function disconnectPaymentAccount(tenantId: string, accountId: string): Promise<TenantPaymentAccount | null> {
  const { rows } = await getPool().query<PaymentAccountRow>(
    `UPDATE tenant_payment_accounts
     SET status = 'disabled', is_active = false, updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [tenantId, accountId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
}

export async function recordPaymentAccountValidation(
  accountId: string,
  result: { ok: true } | { ok: false; error: string },
): Promise<void> {
  await getPool().query(
    `UPDATE tenant_payment_accounts
     SET last_validated_at = now(), last_validation_error = $2, updated_at = now()
     WHERE id = $1`,
    [accountId, result.ok ? null : result.error],
  );
}

interface CredentialsRow {
  key_id: string;
  encrypted_key_secret: string;
  encrypted_webhook_secret: string | null;
}

/** The only function that ever decrypts credentials — used exclusively by PaymentProviderService. */
export async function getDecryptedCredentialsForAccount(accountId: string): Promise<DecryptedCredentials | null> {
  const { rows } = await getPool().query<CredentialsRow>(
    "SELECT key_id, encrypted_key_secret, encrypted_webhook_secret FROM tenant_payment_credentials WHERE payment_account_id = $1",
    [accountId],
  );
  const row = rows[0];
  if (!row) return null;
  return {
    keyId: row.key_id,
    keySecret: decryptSecret(row.encrypted_key_secret),
    webhookSecret: row.encrypted_webhook_secret ? decryptSecret(row.encrypted_webhook_secret) : null,
  };
}
