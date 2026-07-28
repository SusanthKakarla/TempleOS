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

/**
 * Provisioning-time link, and also the underlying primitive
 * `connectPaymentAccountForSuperAdmin` re-runs on every manual (re)connect —
 * mirrors `linkWhatsAppAccountForProvisioning`. Uses `ON CONFLICT (tenant_id,
 * provider_key)` (the one row this tenant+provider pair can ever have,
 * connected or not — see migrations/025_payment_provider_framework.sql) to
 * update that row in place rather than a plain INSERT, which would violate
 * the unique constraint the moment a tenant reconnects after a disconnect
 * (the disabled row is never deleted, so it's always still there). Explicitly
 * clears the OAuth-only credential columns and any stale verification state
 * on conflict, since this path always means "this tenant is manual now."
 */
export async function linkPaymentAccountForProvisioning(
  tenantId: string,
  input: PaymentAccountCredentialsInput,
  client: QueryClient,
): Promise<TenantPaymentAccount> {
  const { rows } = await client.query<PaymentAccountRow>(
    `INSERT INTO tenant_payment_accounts (tenant_id, provider_key, connection_method, razorpay_account_id, status, is_active)
     VALUES ($1, $2, 'manual', NULL, 'connected', true)
     ON CONFLICT (tenant_id, provider_key) DO UPDATE SET
       connection_method = 'manual',
       razorpay_account_id = NULL,
       status = 'connected',
       is_active = true,
       last_validated_at = NULL,
       last_validation_error = NULL,
       updated_at = now()
     RETURNING *`,
    [tenantId, input.providerKey],
  );
  const account = mapAccount(rows[0]);
  await client.query(
    `INSERT INTO tenant_payment_credentials (payment_account_id, key_id, encrypted_key_secret, encrypted_webhook_secret)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (payment_account_id) DO UPDATE SET
       key_id = EXCLUDED.key_id,
       encrypted_key_secret = EXCLUDED.encrypted_key_secret,
       encrypted_webhook_secret = EXCLUDED.encrypted_webhook_secret,
       encrypted_access_token = NULL,
       encrypted_refresh_token = NULL,
       access_token_expires_at = NULL,
       public_token = NULL,
       updated_at = now()`,
    [account.id, input.keyId, encryptSecret(input.keySecret), input.webhookSecret ? encryptSecret(input.webhookSecret) : null],
  );
  return account;
}

/** Super Admin manual-connect/update (Temples > [tenant] detail page) — deactivates any prior active account for this tenant first, since only one may be active, then inserts a fresh manual key/secret row. Mirrors the shape `manuallyConnectWhatsAppAccount` plays for WhatsApp. */
export async function connectPaymentAccountForSuperAdmin(
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

export interface PartnerPaymentAccountInput {
  providerKey: PaymentProviderKey;
  razorpayAccountId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  publicToken: string | null;
}

/**
 * OAuth-connect equivalent of `connectPaymentAccountForSuperAdmin` —
 * deactivates any prior active account for this tenant, then upserts a
 * `connection_method = 'partner'` account/credentials pair instead of a
 * manual key/secret one. Same `ON CONFLICT (tenant_id, provider_key)`
 * reasoning as `linkPaymentAccountForProvisioning`: this tenant+provider pair
 * can only ever have one row, so reconnecting after a disconnect (or
 * switching from manual to Partner OAuth) must update that row in place, not
 * insert a second one.
 */
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
       ON CONFLICT (tenant_id, provider_key) DO UPDATE SET
         connection_method = 'partner',
         razorpay_account_id = EXCLUDED.razorpay_account_id,
         status = 'connected',
         is_active = true,
         last_validated_at = NULL,
         last_validation_error = NULL,
         updated_at = now()
       RETURNING *`,
      [tenantId, input.providerKey, input.razorpayAccountId],
    );
    const account = mapAccount(rows[0]);
    await client.query(
      `INSERT INTO tenant_payment_credentials
         (payment_account_id, encrypted_access_token, encrypted_refresh_token, access_token_expires_at, public_token)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (payment_account_id) DO UPDATE SET
         key_id = NULL,
         encrypted_key_secret = NULL,
         encrypted_access_token = EXCLUDED.encrypted_access_token,
         encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
         access_token_expires_at = EXCLUDED.access_token_expires_at,
         public_token = EXCLUDED.public_token,
         updated_at = now()`,
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

/**
 * Stamps the "Verification status" shown on the connection card as
 * confirmed-working right now. Only meant to be called immediately after a
 * connect path that JUST proved the credentials work live — the Super
 * Admin manual-connect route (which blocks the save entirely on a failed
 * `validateCredentials` check) and the Partner OAuth callback (a successful
 * token exchange is itself proof Razorpay accepted the connection). Not
 * called from `linkPaymentAccountForProvisioning`/the wizard's own manual
 * option, since that path never performs a live check to begin with.
 */
export async function markPaymentAccountVerified(accountId: string): Promise<void> {
  await getPool().query(
    "UPDATE tenant_payment_accounts SET last_validated_at = now(), last_validation_error = NULL, updated_at = now() WHERE id = $1",
    [accountId],
  );
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
