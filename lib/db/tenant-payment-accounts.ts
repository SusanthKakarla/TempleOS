import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import type { PaymentProviderKey, TenantPaymentAccount } from "@/types/db";
import { encryptSecret, decryptSecret } from "@/lib/payments/crypto";
import type { DecryptedCredentials } from "@/lib/payments/provider";

interface PaymentAccountRow {
  id: string;
  tenant_id: string;
  provider_key: PaymentProviderKey;
  connection_method: "manual" | "partner";
  razorpay_account_id: string | null;
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
    connectionMethod: row.connection_method,
    razorpayAccountId: row.razorpay_account_id,
    status: row.status,
    isActive: row.is_active,
    lastValidatedAt: row.last_validated_at ? row.last_validated_at.toISOString() : null,
    lastValidationError: row.last_validation_error,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Every tenant with a live, active connection — used by the nightly reconciliation cron, not just the single-tenant lookups below. */
export async function listActiveConnectedPaymentAccounts(): Promise<TenantPaymentAccount[]> {
  const { rows } = await getPool().query<PaymentAccountRow>(
    "SELECT * FROM tenant_payment_accounts WHERE status = 'connected' AND is_active = true",
  );
  return rows.map(mapAccount);
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
}

/** Provisioning-time link (new tenant, no prior payment account to deactivate) — mirrors `linkWhatsAppAccountForProvisioning`. */
export async function linkPaymentAccountForProvisioning(
  tenantId: string,
  input: PaymentAccountCredentialsInput,
  client: QueryClient,
): Promise<TenantPaymentAccount> {
  const { rows } = await client.query<PaymentAccountRow>(
    `INSERT INTO tenant_payment_accounts (tenant_id, provider_key, status, is_active)
     VALUES ($1, $2, 'connected', true)
     RETURNING *`,
    [tenantId, input.providerKey],
  );
  const account = mapAccount(rows[0]);
  await client.query(
    `INSERT INTO tenant_payment_credentials (payment_account_id, key_id, encrypted_key_secret, encrypted_webhook_secret)
     VALUES ($1, $2, $3, $4)`,
    [account.id, input.keyId, encryptSecret(input.keySecret), input.webhookSecret ? encryptSecret(input.webhookSecret) : null],
  );
  return account;
}

export interface PartnerPaymentAccountInput {
  providerKey: PaymentProviderKey;
  razorpayAccountId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  publicToken: string | null;
}

/** OAuth-connect equivalent of `connectPaymentAccount` — deactivates any prior active account for this tenant, then inserts a `connection_method = 'partner'` account/credentials pair instead of a manual key/secret one. */
export async function linkPartnerPaymentAccountForTenant(
  tenantId: string,
  input: PartnerPaymentAccountInput,
): Promise<TenantPaymentAccount> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "UPDATE tenant_payment_accounts SET is_active = false, updated_at = now() WHERE tenant_id = $1 AND is_active = true",
      [tenantId],
    );
    const { rows } = await client.query<PaymentAccountRow>(
      `INSERT INTO tenant_payment_accounts
         (tenant_id, provider_key, connection_method, razorpay_account_id, status, is_active)
       VALUES ($1, $2, 'partner', $3, 'connected', true)
       RETURNING *`,
      [tenantId, input.providerKey, input.razorpayAccountId],
    );
    const account = mapAccount(rows[0]);
    await client.query(
      `INSERT INTO tenant_payment_credentials
         (payment_account_id, encrypted_access_token, encrypted_refresh_token, access_token_expires_at, public_token)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        account.id,
        encryptSecret(input.accessToken),
        encryptSecret(input.refreshToken),
        input.accessTokenExpiresAt,
        input.publicToken,
      ],
    );
    await client.query("COMMIT");
    return account;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Partner mode only — used by the reconciliation cron's token-refresh step and the partner webhook's tenant resolution. */
export async function updateOAuthTokensForAccount(
  accountId: string,
  tokens: { accessToken: string; refreshToken: string; accessTokenExpiresAt: Date },
): Promise<void> {
  await getPool().query(
    `UPDATE tenant_payment_credentials
     SET encrypted_access_token = $2, encrypted_refresh_token = $3, access_token_expires_at = $4
     WHERE payment_account_id = $1`,
    [accountId, encryptSecret(tokens.accessToken), encryptSecret(tokens.refreshToken), tokens.accessTokenExpiresAt],
  );
}

export async function getPaymentAccountByRazorpayAccountId(razorpayAccountId: string): Promise<TenantPaymentAccount | null> {
  const { rows } = await getPool().query<PaymentAccountRow>(
    "SELECT * FROM tenant_payment_accounts WHERE razorpay_account_id = $1 AND is_active = true",
    [razorpayAccountId],
  );
  return rows[0] ? mapAccount(rows[0]) : null;
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

interface CredentialsRow {
  key_id: string | null;
  encrypted_key_secret: string | null;
  encrypted_webhook_secret: string | null;
  encrypted_access_token: string | null;
  encrypted_refresh_token: string | null;
  access_token_expires_at: Date | null;
  public_token: string | null;
}

/** The only function that ever decrypts credentials — used exclusively by PaymentProviderService. Branches on which columns are populated: `tenant_payment_credentials_mode_check` guarantees exactly one shape ever exists per row. */
export async function getDecryptedCredentialsForAccount(accountId: string): Promise<DecryptedCredentials | null> {
  const { rows } = await getPool().query<CredentialsRow>(
    `SELECT key_id, encrypted_key_secret, encrypted_webhook_secret, encrypted_access_token, encrypted_refresh_token, access_token_expires_at, public_token
     FROM tenant_payment_credentials WHERE payment_account_id = $1`,
    [accountId],
  );
  const row = rows[0];
  if (!row) return null;
  const webhookSecret = row.encrypted_webhook_secret ? decryptSecret(row.encrypted_webhook_secret) : null;
  if (row.encrypted_access_token && row.encrypted_refresh_token) {
    return {
      mode: "oauth",
      accessToken: decryptSecret(row.encrypted_access_token),
      refreshToken: decryptSecret(row.encrypted_refresh_token),
      accessTokenExpiresAt: (row.access_token_expires_at as Date).toISOString(),
      publicToken: row.public_token,
      webhookSecret,
    };
  }
  return {
    mode: "api_key",
    keyId: row.key_id as string,
    keySecret: decryptSecret(row.encrypted_key_secret as string),
    webhookSecret,
  };
}
