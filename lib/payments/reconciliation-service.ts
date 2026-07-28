import {
  listActiveConnectedPaymentAccounts,
  getDecryptedCredentialsForAccount,
  updateOAuthTokensForAccount,
} from "@/lib/db/tenant-payment-accounts";
import { listStaleNonTerminalTransactions } from "@/lib/db/payment-transactions";
import { recordReconciliationRun } from "@/lib/db/payment-reconciliation-logs";
import { fetchOrderPaymentForTenant } from "./payment-provider-service";
import { applyPaymentEvent } from "./campaign-payment-service";
import { refreshAccessToken } from "./razorpay-oauth-client";
import { PaymentAuditService } from "./payment-audit";
import type { PaymentReconciliationLog, TenantPaymentAccount } from "@/types/db";

/** Refresh once the token has under this much life left — well inside the 90-day access-token lifetime, checked every nightly run. */
const REFRESH_WITHIN_DAYS = 7;

/**
 * Partner (OAuth) accounts only — Razorpay's access tokens expire (90 days)
 * and must be refreshed with the (180-day) refresh token before they lapse.
 * Folded into the existing nightly reconciliation loop rather than a new
 * cron: every connected account is already iterated here once a day, which
 * is a fine cadence for a week-out refresh window.
 */
async function refreshOAuthTokenIfNeeded(account: TenantPaymentAccount): Promise<void> {
  if (account.connectionMethod !== "partner") return;
  const creds = await getDecryptedCredentialsForAccount(account.id);
  if (!creds || creds.mode !== "oauth") return;

  const expiresAt = new Date(creds.accessTokenExpiresAt).getTime();
  const refreshThreshold = Date.now() + REFRESH_WITHIN_DAYS * 24 * 60 * 60 * 1000;
  if (expiresAt > refreshThreshold) return;

  try {
    const tokens = await refreshAccessToken(creds.refreshToken);
    await updateOAuthTokensForAccount(account.id, {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1000),
    });
  } catch (err) {
    await PaymentAuditService.oauthTokenRefreshFailed(
      account.tenantId,
      account.id,
      err instanceof Error ? err.message : "Unknown error",
    );
  }
}

/** Transactions younger than this are still genuinely in flight — checking them would just be noise, not a real mismatch. */
const STALE_AFTER_MINUTES = 15;

interface ReconciliationDetail {
  transactionId: string;
  issue: "missed_capture";
  providerPaymentId: string;
}

/**
 * Compares TempleOS's own record of "still pending" transactions against
 * what Razorpay actually shows. The only auto-resolvable mismatch this
 * checks for is a missed webhook (Razorpay captured the payment, but our
 * webhook never arrived or was dropped) — it re-runs the exact same
 * capture path a real webhook would have, through the same idempotent CAS,
 * so it can never double-process a transaction the webhook already caught
 * in the meantime.
 */
export async function reconcileTenant(tenantId: string): Promise<PaymentReconciliationLog> {
  const staleTransactions = await listStaleNonTerminalTransactions(tenantId, STALE_AFTER_MINUTES);
  const details: ReconciliationDetail[] = [];
  let autoResolved = 0;

  for (const transaction of staleTransactions) {
    const result = await fetchOrderPaymentForTenant(tenantId, transaction.providerOrderId);
    if (!result?.capturedPaymentId) continue; // genuinely still pending/abandoned — not a mismatch

    details.push({ transactionId: transaction.id, issue: "missed_capture", providerPaymentId: result.capturedPaymentId });
    await applyPaymentEvent(transaction.paymentAccountId, transaction.providerOrderId, {
      type: "captured",
      providerPaymentId: result.capturedPaymentId,
    });
    autoResolved += 1;
  }

  const log = await recordReconciliationRun({
    tenantId,
    transactionsChecked: staleTransactions.length,
    mismatchesFound: details.length,
    autoResolved,
    details,
  });

  if (details.length > 0) {
    await PaymentAuditService.reconciliationRunCompleted(tenantId, log.id, details.length, autoResolved);
  }

  return log;
}

export interface ReconcileAllResult {
  tenantsChecked: number;
  totalMismatches: number;
  totalAutoResolved: number;
}

export async function reconcileAllTenants(): Promise<ReconcileAllResult> {
  const accounts = await listActiveConnectedPaymentAccounts();
  let totalMismatches = 0;
  let totalAutoResolved = 0;

  for (const account of accounts) {
    await refreshOAuthTokenIfNeeded(account);
    const log = await reconcileTenant(account.tenantId);
    totalMismatches += log.mismatchesFound;
    totalAutoResolved += log.autoResolved;
  }

  return { tenantsChecked: accounts.length, totalMismatches, totalAutoResolved };
}
