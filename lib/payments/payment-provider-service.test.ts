import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getActivePaymentAccountForTenant,
  getDecryptedCredentialsForAccount,
} from "@/lib/db/tenant-payment-accounts";
import {
  createOrderForTenant,
  getActiveProviderForTenant,
  parseWebhookEvent,
  verifyPartnerWebhookSignature,
  verifyWebhookSignatureForAccount,
} from "./payment-provider-service";

vi.mock("@/lib/db/tenant-payment-accounts", () => ({
  getActivePaymentAccountForTenant: vi.fn(),
  getDecryptedCredentialsForAccount: vi.fn(),
}));

// createOrderForTenant goes through the real RazorpayAdapter (this file tests
// the service layer's public-key selection, not the adapter itself) — mocked
// here purely to avoid a real network call to Razorpay's API in a unit test.
vi.mock("razorpay", () => ({
  default: class MockRazorpay {
    orders = { create: vi.fn().mockResolvedValue({ id: "order_mock_1" }) };
  },
}));

const account = {
  id: "acct-1",
  tenantId: "tenant-1",
  providerKey: "razorpay" as const,
  connectionMethod: "manual" as const,
  razorpayAccountId: null,
  providerMerchantId: null,
  environment: "production" as const,
  status: "connected" as const,
  isActive: true,
  lastValidatedAt: null,
  lastValidationError: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("PaymentProviderService", () => {
  beforeEach(() => {
    vi.mocked(getActivePaymentAccountForTenant).mockReset();
    vi.mocked(getDecryptedCredentialsForAccount).mockReset();
  });

  it("resolves the registered razorpay adapter for a tenant's active account", async () => {
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(account);
    const active = await getActiveProviderForTenant("tenant-1");
    expect(active?.adapter.key).toBe("razorpay");
  });

  it("returns null when the tenant has no active payment account", async () => {
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(null);
    expect(await getActiveProviderForTenant("tenant-1")).toBeNull();
  });

  it("returns null from createOrderForTenant when credentials can't be decrypted (e.g. row missing)", async () => {
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue(account);
    vi.mocked(getDecryptedCredentialsForAccount).mockResolvedValue(null);
    const result = await createOrderForTenant("tenant-1", { amountPaise: 10000, currency: "INR", receiptRef: "r1" });
    expect(result).toBeNull();
  });

  it("returns false from verifyWebhookSignatureForAccount when credentials can't be decrypted", async () => {
    vi.mocked(getDecryptedCredentialsForAccount).mockResolvedValue(null);
    const verified = await verifyWebhookSignatureForAccount("tenant-1", "acct-1", "razorpay", "{}", "sig");
    expect(verified).toBe(false);
  });

  it("parseWebhookEvent dispatches to the razorpay adapter's parser", () => {
    const event = parseWebhookEvent("razorpay", JSON.stringify({ event: "payment.failed", payload: {} }));
    expect(event.type).toBe("payment.failed");
  });

  it("throws for an unregistered provider key (e.g. stripe — framework-ready but no adapter written yet)", () => {
    expect(() => parseWebhookEvent("stripe", "{}")).toThrow('No payment provider adapter registered for "stripe"');
  });

  it("createOrderForTenant returns the Partner public_token as the checkout key for OAuth-connected tenants", async () => {
    vi.mocked(getActivePaymentAccountForTenant).mockResolvedValue({ ...account, connectionMethod: "partner" });
    vi.mocked(getDecryptedCredentialsForAccount).mockResolvedValue({
      mode: "oauth",
      accessToken: "at",
      refreshToken: "rt",
      accessTokenExpiresAt: new Date().toISOString(),
      publicToken: "rzp_public_token",
      webhookSecret: null,
    });
    const result = await createOrderForTenant("tenant-1", { amountPaise: 10000, currency: "INR", receiptRef: "r1" });
    expect(result?.keyId).toBe("rzp_public_token");
  });
});

describe("verifyPartnerWebhookSignature", () => {
  const originalSecret = process.env.RAZORPAY_PARTNER_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.RAZORPAY_PARTNER_WEBHOOK_SECRET = originalSecret;
  });

  it("returns false when RAZORPAY_PARTNER_WEBHOOK_SECRET is not configured", () => {
    delete process.env.RAZORPAY_PARTNER_WEBHOOK_SECRET;
    expect(verifyPartnerWebhookSignature("{}", "anything")).toBe(false);
  });

  it("verifies against RAZORPAY_PARTNER_WEBHOOK_SECRET when configured", async () => {
    const { createHmac } = await import("node:crypto");
    process.env.RAZORPAY_PARTNER_WEBHOOK_SECRET = "partner_webhook_secret";
    const rawBody = JSON.stringify({ event: "payment.captured", account_id: "acc_1" });
    const signature = createHmac("sha256", "partner_webhook_secret").update(rawBody).digest("hex");
    expect(verifyPartnerWebhookSignature(rawBody, signature)).toBe(true);
  });
});
