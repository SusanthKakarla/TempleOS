import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listStaleNonTerminalTransactions,
  listCapturedTransactionsMissingDonation,
  getPaymentTransactionById,
} from "@/lib/db/payment-transactions";
import { recordReconciliationRun } from "@/lib/db/payment-reconciliation-logs";
import {
  listActiveConnectedPaymentAccounts,
  getDecryptedCredentialsForAccount,
  updateOAuthTokensForAccount,
} from "@/lib/db/tenant-payment-accounts";
import { fetchOrderPaymentForTenant } from "./payment-provider-service";
import { applyPaymentEvent, runCaptureSideEffects } from "./campaign-payment-service";
import { refreshAccessToken } from "./razorpay-oauth-client";
import { PaymentAuditService } from "./payment-audit";
import { reconcileTenant, reconcileAllTenants } from "./reconciliation-service";
import type { PaymentTransaction, TenantPaymentAccount } from "@/types/db";

vi.mock("@/lib/db/payment-transactions", () => ({
  listStaleNonTerminalTransactions: vi.fn(),
  listCapturedTransactionsMissingDonation: vi.fn(),
  getPaymentTransactionById: vi.fn(),
}));
vi.mock("@/lib/db/payment-reconciliation-logs", () => ({
  recordReconciliationRun: vi.fn(),
}));
vi.mock("@/lib/db/tenant-payment-accounts", () => ({
  listActiveConnectedPaymentAccounts: vi.fn(),
  getDecryptedCredentialsForAccount: vi.fn(),
  updateOAuthTokensForAccount: vi.fn(),
}));
vi.mock("./payment-provider-service", () => ({
  fetchOrderPaymentForTenant: vi.fn(),
}));
vi.mock("./campaign-payment-service", () => ({
  applyPaymentEvent: vi.fn(),
  runCaptureSideEffects: vi.fn(),
}));
vi.mock("./razorpay-oauth-client", () => ({
  refreshAccessToken: vi.fn(),
}));
vi.mock("./payment-audit", () => ({
  PaymentAuditService: { reconciliationRunCompleted: vi.fn(), oauthTokenRefreshFailed: vi.fn() },
}));

function makeTransaction(overrides: Partial<PaymentTransaction> = {}): PaymentTransaction {
  return {
    id: "txn-1",
    tenantId: "tenant-1",
    paymentAccountId: "acct-1",
    campaignId: null,
    donationId: null,
    providerKey: "razorpay",
    providerOrderId: "order_1",
    providerPaymentId: null,
    amount: 500,
    currency: "INR",
    status: "created",
    donorName: "Ravi",
    donorPhone: null,
    donorEmail: null,
    donorPan: null,
    donorMessage: null,
    isAnonymous: false,
    receiptNumber: null,
    receiptUrl: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const loggedRun = {
  id: "log-1",
  tenantId: "tenant-1",
  runAt: "2026-01-01T00:00:00.000Z",
  transactionsChecked: 1,
  mismatchesFound: 0,
  autoResolved: 0,
  details: [],
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("reconcileTenant", () => {
  beforeEach(() => {
    vi.mocked(listStaleNonTerminalTransactions).mockReset().mockResolvedValue([]);
    vi.mocked(listCapturedTransactionsMissingDonation).mockReset().mockResolvedValue([]);
    vi.mocked(getPaymentTransactionById).mockReset();
    vi.mocked(recordReconciliationRun).mockReset();
    vi.mocked(fetchOrderPaymentForTenant).mockReset();
    vi.mocked(applyPaymentEvent).mockReset();
    vi.mocked(runCaptureSideEffects).mockReset();
    vi.mocked(PaymentAuditService.reconciliationRunCompleted).mockReset();
    vi.mocked(recordReconciliationRun).mockResolvedValue(loggedRun);
  });

  it("leaves a transaction alone when the provider shows no captured payment (genuinely still pending)", async () => {
    vi.mocked(listStaleNonTerminalTransactions).mockResolvedValue([makeTransaction()]);
    vi.mocked(fetchOrderPaymentForTenant).mockResolvedValue({ capturedPaymentId: null, amountPaise: null });

    await reconcileTenant("tenant-1");

    expect(applyPaymentEvent).not.toHaveBeenCalled();
    expect(recordReconciliationRun).toHaveBeenCalledWith(
      expect.objectContaining({ transactionsChecked: 1, mismatchesFound: 0, autoResolved: 0 }),
    );
  });

  it("auto-resolves a missed webhook by re-running the same capture path a webhook would have", async () => {
    const transaction = makeTransaction();
    vi.mocked(listStaleNonTerminalTransactions).mockResolvedValue([transaction]);
    vi.mocked(fetchOrderPaymentForTenant).mockResolvedValue({ capturedPaymentId: "pay_missed", amountPaise: 50000 });
    vi.mocked(recordReconciliationRun).mockResolvedValue({ ...loggedRun, mismatchesFound: 1, autoResolved: 1 });

    await reconcileTenant("tenant-1");

    expect(applyPaymentEvent).toHaveBeenCalledWith(transaction.paymentAccountId, transaction.providerOrderId, {
      type: "captured",
      providerPaymentId: "pay_missed",
    });
    expect(PaymentAuditService.reconciliationRunCompleted).toHaveBeenCalledWith("tenant-1", "log-1", 1, 1);
  });

  it("does not audit-log when nothing was found (avoids noise on every clean nightly run)", async () => {
    vi.mocked(listStaleNonTerminalTransactions).mockResolvedValue([]);

    await reconcileTenant("tenant-1");

    expect(PaymentAuditService.reconciliationRunCompleted).not.toHaveBeenCalled();
  });

  it("retries a transaction stuck at captured with no donation attached, and counts it as auto-resolved once it gets one", async () => {
    const stuck = makeTransaction({ status: "captured", providerPaymentId: "pay_stuck" });
    vi.mocked(listCapturedTransactionsMissingDonation).mockResolvedValue([stuck]);
    vi.mocked(getPaymentTransactionById).mockResolvedValue({ ...stuck, donationId: "donation-1" });
    vi.mocked(recordReconciliationRun).mockResolvedValue({ ...loggedRun, mismatchesFound: 1, autoResolved: 1 });

    await reconcileTenant("tenant-1");

    expect(runCaptureSideEffects).toHaveBeenCalledWith("txn-1");
    expect(recordReconciliationRun).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionsChecked: 1,
        details: [expect.objectContaining({ transactionId: "txn-1", issue: "missed_capture_side_effects" })],
      }),
    );
    expect(PaymentAuditService.reconciliationRunCompleted).toHaveBeenCalledWith("tenant-1", "log-1", 1, 1);
  });

  it("does not count a stuck capture as auto-resolved if it still has no donation after retrying (still failing)", async () => {
    const stuck = makeTransaction({ status: "captured", providerPaymentId: "pay_stuck" });
    vi.mocked(listCapturedTransactionsMissingDonation).mockResolvedValue([stuck]);
    vi.mocked(getPaymentTransactionById).mockResolvedValue(stuck); // still no donationId
    vi.mocked(recordReconciliationRun).mockResolvedValue({ ...loggedRun, mismatchesFound: 1, autoResolved: 0 });

    await reconcileTenant("tenant-1");

    expect(recordReconciliationRun).toHaveBeenCalledWith(expect.objectContaining({ autoResolved: 0 }));
  });
});

describe("reconcileAllTenants", () => {
  beforeEach(() => {
    vi.mocked(listActiveConnectedPaymentAccounts).mockReset();
    vi.mocked(listStaleNonTerminalTransactions).mockReset();
    vi.mocked(listCapturedTransactionsMissingDonation).mockReset().mockResolvedValue([]);
    vi.mocked(recordReconciliationRun).mockReset();
    vi.mocked(getDecryptedCredentialsForAccount).mockReset();
    vi.mocked(updateOAuthTokensForAccount).mockReset();
    vi.mocked(refreshAccessToken).mockReset();
    vi.mocked(PaymentAuditService.oauthTokenRefreshFailed).mockReset();
  });

  it("reconciles every active, connected tenant and sums the totals", async () => {
    vi.mocked(listActiveConnectedPaymentAccounts).mockResolvedValue([
      { tenantId: "tenant-1", connectionMethod: "manual" } as TenantPaymentAccount,
      { tenantId: "tenant-2", connectionMethod: "manual" } as TenantPaymentAccount,
    ]);
    vi.mocked(listStaleNonTerminalTransactions).mockResolvedValue([]);
    vi.mocked(recordReconciliationRun).mockResolvedValue(loggedRun);

    const result = await reconcileAllTenants();

    expect(result.tenantsChecked).toBe(2);
    expect(listStaleNonTerminalTransactions).toHaveBeenCalledWith("tenant-1", expect.any(Number));
    expect(listStaleNonTerminalTransactions).toHaveBeenCalledWith("tenant-2", expect.any(Number));
    expect(getDecryptedCredentialsForAccount).not.toHaveBeenCalled();
  });

  it("skips the token-refresh step entirely for manual-mode accounts", async () => {
    vi.mocked(listActiveConnectedPaymentAccounts).mockResolvedValue([
      { tenantId: "tenant-1", id: "acct-1", connectionMethod: "manual" } as TenantPaymentAccount,
    ]);
    vi.mocked(listStaleNonTerminalTransactions).mockResolvedValue([]);
    vi.mocked(recordReconciliationRun).mockResolvedValue(loggedRun);

    await reconcileAllTenants();

    expect(getDecryptedCredentialsForAccount).not.toHaveBeenCalled();
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it("refreshes an OAuth token that expires within the 7-day window", async () => {
    vi.mocked(listActiveConnectedPaymentAccounts).mockResolvedValue([
      { tenantId: "tenant-1", id: "acct-1", connectionMethod: "partner" } as TenantPaymentAccount,
    ]);
    vi.mocked(getDecryptedCredentialsForAccount).mockResolvedValue({
      mode: "oauth",
      accessToken: "old_access",
      refreshToken: "old_refresh",
      accessTokenExpiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days out
      publicToken: null,
      webhookSecret: null,
    });
    vi.mocked(refreshAccessToken).mockResolvedValue({
      accessToken: "new_access",
      refreshToken: "new_refresh",
      publicToken: null,
      razorpayAccountId: "acc_1",
      expiresInSeconds: 7776000,
    });
    vi.mocked(listStaleNonTerminalTransactions).mockResolvedValue([]);
    vi.mocked(recordReconciliationRun).mockResolvedValue(loggedRun);

    await reconcileAllTenants();

    expect(refreshAccessToken).toHaveBeenCalledWith("old_refresh");
    expect(updateOAuthTokensForAccount).toHaveBeenCalledWith(
      "acct-1",
      expect.objectContaining({ accessToken: "new_access", refreshToken: "new_refresh" }),
    );
  });

  it("does not refresh an OAuth token that still has plenty of time left", async () => {
    vi.mocked(listActiveConnectedPaymentAccounts).mockResolvedValue([
      { tenantId: "tenant-1", id: "acct-1", connectionMethod: "partner" } as TenantPaymentAccount,
    ]);
    vi.mocked(getDecryptedCredentialsForAccount).mockResolvedValue({
      mode: "oauth",
      accessToken: "access",
      refreshToken: "refresh",
      accessTokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days out
      publicToken: null,
      webhookSecret: null,
    });
    vi.mocked(listStaleNonTerminalTransactions).mockResolvedValue([]);
    vi.mocked(recordReconciliationRun).mockResolvedValue(loggedRun);

    await reconcileAllTenants();

    expect(refreshAccessToken).not.toHaveBeenCalled();
    expect(updateOAuthTokensForAccount).not.toHaveBeenCalled();
  });

  it("audit-logs and continues (never throws) when the refresh call itself fails", async () => {
    vi.mocked(listActiveConnectedPaymentAccounts).mockResolvedValue([
      { tenantId: "tenant-1", id: "acct-1", connectionMethod: "partner" } as TenantPaymentAccount,
    ]);
    vi.mocked(getDecryptedCredentialsForAccount).mockResolvedValue({
      mode: "oauth",
      accessToken: "old_access",
      refreshToken: "old_refresh",
      accessTokenExpiresAt: new Date(Date.now() + 1000).toISOString(),
      publicToken: null,
      webhookSecret: null,
    });
    vi.mocked(refreshAccessToken).mockRejectedValue(new Error("refresh_token expired"));
    vi.mocked(listStaleNonTerminalTransactions).mockResolvedValue([]);
    vi.mocked(recordReconciliationRun).mockResolvedValue(loggedRun);

    await expect(reconcileAllTenants()).resolves.toBeTruthy();
    expect(PaymentAuditService.oauthTokenRefreshFailed).toHaveBeenCalledWith("tenant-1", "acct-1", "refresh_token expired");
    expect(updateOAuthTokensForAccount).not.toHaveBeenCalled();
  });
});
