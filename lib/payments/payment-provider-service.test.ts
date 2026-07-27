import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getActivePaymentAccountForTenant,
  getDecryptedCredentialsForAccount,
} from "@/lib/db/tenant-payment-accounts";
import {
  createOrderForTenant,
  getActiveProviderForTenant,
  parseWebhookEvent,
  verifyWebhookSignatureForAccount,
} from "./payment-provider-service";

vi.mock("@/lib/db/tenant-payment-accounts", () => ({
  getActivePaymentAccountForTenant: vi.fn(),
  getDecryptedCredentialsForAccount: vi.fn(),
}));

const account = {
  id: "acct-1",
  tenantId: "tenant-1",
  providerKey: "razorpay" as const,
  businessName: "Temple Trust",
  merchantName: "Temple Trust",
  contactEmail: "a@b.com",
  contactPhone: "+911234567890",
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
    const verified = await verifyWebhookSignatureForAccount("acct-1", "razorpay", "{}", "sig");
    expect(verified).toBe(false);
  });

  it("parseWebhookEvent dispatches to the razorpay adapter's parser", () => {
    const event = parseWebhookEvent("razorpay", JSON.stringify({ event: "payment.failed", payload: {} }));
    expect(event.type).toBe("payment.failed");
  });

  it("throws for an unregistered provider key (e.g. stripe — framework-ready but no adapter written yet)", () => {
    expect(() => parseWebhookEvent("stripe", "{}")).toThrow('No payment provider adapter registered for "stripe"');
  });
});
