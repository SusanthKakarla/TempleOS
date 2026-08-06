import { getPool } from "./pool";
import type { PaymentProvider, PaymentProviderKey, PaymentProviderStatus, PaymentConnectionMethod } from "@/types/db";

interface PaymentProviderRow {
  key: PaymentProviderKey;
  label: string;
  status: PaymentProviderStatus;
  manual_enabled: boolean;
  partner_enabled: boolean;
  default_connection_method: PaymentConnectionMethod;
}

function mapProvider(row: PaymentProviderRow): PaymentProvider {
  return {
    key: row.key,
    label: row.label,
    status: row.status,
    manualEnabled: row.manual_enabled,
    partnerEnabled: row.partner_enabled,
    defaultConnectionMethod: row.default_connection_method,
  };
}

/** The Super Admin Platform Payment Settings catalog — every provider row TempleOS knows about, active or coming-soon. */
export async function listPaymentProviders(): Promise<PaymentProvider[]> {
  const { rows } = await getPool().query<PaymentProviderRow>("SELECT * FROM payment_providers ORDER BY key");
  return rows.map(mapProvider);
}

/**
 * Whether checkout may actually use this provider right now — the single
 * enforcement point behind the V0 "TempleOS does not process payments
 * directly" decision. `resolveDonationCheckoutAvailability` calls this after
 * finding a tenant's active account so that flipping Razorpay/PhonePe to
 * `coming_soon` (see migrations/039) immediately blocks checkout for every
 * already-connected tenant, platform-wide, with no per-tenant changes.
 * Reverting is the same one-row UPDATE in the other direction.
 */
export async function isProviderActive(key: PaymentProviderKey): Promise<boolean> {
  const { rows } = await getPool().query<{ status: PaymentProviderStatus }>(
    "SELECT status FROM payment_providers WHERE key = $1",
    [key],
  );
  return rows[0]?.status === "active";
}

export interface UpdatePaymentProviderSettingsInput {
  status?: PaymentProviderStatus;
  manualEnabled?: boolean;
  partnerEnabled?: boolean;
  defaultConnectionMethod?: PaymentConnectionMethod;
}

/**
 * Super Admin platform-wide toggle — affects every tenant simultaneously,
 * same blast radius as flipping `payment_providers.status` already had
 * before this (previously only settable via a raw migration/SQL, no UI
 * existed). Only the fields present in `input` are changed; omitted fields
 * keep their current value via `COALESCE`.
 */
export async function updatePaymentProviderSettings(
  key: PaymentProviderKey,
  input: UpdatePaymentProviderSettingsInput,
): Promise<PaymentProvider | null> {
  const { rows } = await getPool().query<PaymentProviderRow>(
    `UPDATE payment_providers
     SET status = COALESCE($2, status),
         manual_enabled = COALESCE($3, manual_enabled),
         partner_enabled = COALESCE($4, partner_enabled),
         default_connection_method = COALESCE($5, default_connection_method)
     WHERE key = $1
     RETURNING *`,
    [key, input.status ?? null, input.manualEnabled ?? null, input.partnerEnabled ?? null, input.defaultConnectionMethod ?? null],
  );
  return rows[0] ? mapProvider(rows[0]) : null;
}
