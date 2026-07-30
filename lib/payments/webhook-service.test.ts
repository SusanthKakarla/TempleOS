import { beforeEach, describe, expect, it, vi } from "vitest";
import { getActivePaymentAccountForTenant, getPaymentAccountByRazorpayAccountId } from "@/lib/db/tenant-payment-accounts";
import { logPaymentWebhook } from "@/lib/db/payment-webhook-logs";
import { verifyWebhookSignatureForAccount, parseWebhookEvent, verifyPartnerWebhookSignature } from "./payment-provider-service";
import { applyPaymentEvent, applyRefundEvent } from "./campaign-payment-service";
import { handleRazorpayWebhook, handleRazorpayPartnerWebhook } from "./webhook-service";
import type { TenantPaymentAccount } from "@/types/db";

vi.mock("@/lib/db/tenant-payment-accounts", () => ({
  getActivePaymentAccountForTenant: vi.fn(),
  getPaymentAccountByRazorpayAccountId: vi.fn(),
}));
vi.mock("@/lib/db/payment-webhook-logs", () => ({
  logPaymentWebhook: vi.fn(),
}));
vi.mock("./payment-provider-service", () => ({
  verifyWebhookSignatureForAccount: vi.fn(),
  verifyPartnerWebhookSignature: vi.fn(),
  parseWebhookEvent: vi.fn(),
}));
vi.mock("./campaign-payment-service", () => ({
  applyPaymentEvent: vi.fn(),
  applyRefundEvent: vi.fn(),
}));

const account = { id: "acct-1", tenantId: "tenant-1", providerKey: "razorpay" } as TenantPaymentAccount;

describe("handleRazorpayWebhook — dispatch routing", () => {
  beforeEach(() => {
    vi.mocked(getActivePaymentAccountForTenant).mockReset().mockResolvedValue(account);
    vi.mocked(logPaymentWebhook).mockReset();
    vi.mocked(verifyWebhookSignatureForAccount).mockReset().mockResolvedValue(true);
    vi.mocked(parseWebhookEvent).mockReset();
    vi.mocked(applyPaymentEvent).mockReset();
    vi.mocked(applyRefundEvent).mockReset();
  });

  it("routes a payment.captured event to applyPaymentEvent, not applyRefundEvent", async () => {
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "payment.captured",
      providerOrderId: "order_1",
      providerPaymentId: "pay_1",
      providerRefundId: null,
      amountPaise: 50000,
      providerAccountId: null,
    });

    const result = await handleRazorpayWebhook("tenant-1", "{}", "sig");

    expect(result).toEqual({ status: 200 });
    expect(applyPaymentEvent).toHaveBeenCalledWith("acct-1", "order_1", { type: "captured", providerPaymentId: "pay_1" });
    expect(applyRefundEvent).not.toHaveBeenCalled();
  });

  it("routes payment_link.paid to applyPaymentEvent as a captured event (forward-compatibility mapping)", async () => {
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "payment.link.paid",
      providerOrderId: "order_2",
      providerPaymentId: "pay_2",
      providerRefundId: null,
      amountPaise: 10000,
      providerAccountId: null,
    });

    await handleRazorpayWebhook("tenant-1", "{}", "sig");

    expect(applyPaymentEvent).toHaveBeenCalledWith("acct-1", "order_2", { type: "captured", providerPaymentId: "pay_2" });
  });

  it("routes a refund.processed event to applyRefundEvent, not applyPaymentEvent", async () => {
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "refund.processed",
      providerOrderId: null,
      providerPaymentId: "pay_3",
      providerRefundId: "rfnd_1",
      amountPaise: 20000,
      providerAccountId: null,
    });

    await handleRazorpayWebhook("tenant-1", "{}", "sig");

    expect(applyRefundEvent).toHaveBeenCalledWith("acct-1", "pay_3", "rfnd_1", "processed", 20000);
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("routes a refund.failed event with the 'failed' status", async () => {
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "refund.failed",
      providerOrderId: null,
      providerPaymentId: "pay_4",
      providerRefundId: "rfnd_2",
      amountPaise: null,
      providerAccountId: null,
    });

    await handleRazorpayWebhook("tenant-1", "{}", "sig");

    expect(applyRefundEvent).toHaveBeenCalledWith("acct-1", "pay_4", "rfnd_2", "failed", null);
  });

  it("never dispatches anything when the signature is invalid", async () => {
    vi.mocked(verifyWebhookSignatureForAccount).mockResolvedValue(false);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "payment.captured",
      providerOrderId: "order_1",
      providerPaymentId: "pay_1",
      providerRefundId: null,
      amountPaise: 50000,
      providerAccountId: null,
    });

    const result = await handleRazorpayWebhook("tenant-1", "{}", "sig");

    expect(result).toEqual({ status: 400 });
    expect(applyPaymentEvent).not.toHaveBeenCalled();
    expect(applyRefundEvent).not.toHaveBeenCalled();
  });

  it("still logs the attempt when an unexpected exception is thrown mid-flight (e.g. a transient decrypt/DB error)", async () => {
    vi.mocked(verifyWebhookSignatureForAccount).mockRejectedValue(new Error("decrypt failed: bad auth tag"));

    const result = await handleRazorpayWebhook("tenant-1", "{}", "sig");

    expect(result).toEqual({ status: 400 });
    expect(logPaymentWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: "Unhandled exception: decrypt failed: bad auth tag" }),
    );
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });
});

describe("handleRazorpayPartnerWebhook — tenant resolution by razorpay_account_id", () => {
  beforeEach(() => {
    vi.mocked(getPaymentAccountByRazorpayAccountId).mockReset();
    vi.mocked(logPaymentWebhook).mockReset();
    vi.mocked(verifyPartnerWebhookSignature).mockReset().mockReturnValue(true);
    vi.mocked(parseWebhookEvent).mockReset();
    vi.mocked(applyPaymentEvent).mockReset();
    vi.mocked(applyRefundEvent).mockReset();
  });

  it("resolves the tenant via the event's account_id and dispatches normally", async () => {
    vi.mocked(getPaymentAccountByRazorpayAccountId).mockResolvedValue(account);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "payment.captured",
      providerOrderId: "order_1",
      providerPaymentId: "pay_1",
      providerRefundId: null,
      amountPaise: 50000,
      providerAccountId: "acc_partner_1",
    });

    const result = await handleRazorpayPartnerWebhook("{}", "sig");

    expect(result).toEqual({ status: 200 });
    expect(getPaymentAccountByRazorpayAccountId).toHaveBeenCalledWith("acc_partner_1");
    expect(applyPaymentEvent).toHaveBeenCalledWith("acct-1", "order_1", { type: "captured", providerPaymentId: "pay_1" });
  });

  it("returns 404 and never dispatches when no account matches the event's account_id", async () => {
    vi.mocked(getPaymentAccountByRazorpayAccountId).mockResolvedValue(null);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "payment.captured",
      providerOrderId: "order_1",
      providerPaymentId: "pay_1",
      providerRefundId: null,
      amountPaise: 50000,
      providerAccountId: "acc_unknown",
    });

    const result = await handleRazorpayPartnerWebhook("{}", "sig");

    expect(result).toEqual({ status: 404 });
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("returns 400 and never resolves a tenant when the platform signature is invalid", async () => {
    vi.mocked(verifyPartnerWebhookSignature).mockReturnValue(false);
    vi.mocked(parseWebhookEvent).mockReturnValue({
      type: "payment.captured",
      providerOrderId: "order_1",
      providerPaymentId: "pay_1",
      providerRefundId: null,
      amountPaise: 50000,
      providerAccountId: "acc_partner_1",
    });

    const result = await handleRazorpayPartnerWebhook("{}", "sig");

    expect(result).toEqual({ status: 400 });
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });

  it("returns 400 when the signature header is missing", async () => {
    const result = await handleRazorpayPartnerWebhook("{}", null);
    expect(result).toEqual({ status: 400 });
    expect(logPaymentWebhook).toHaveBeenCalledWith(expect.objectContaining({ errorMessage: "Missing X-Razorpay-Signature header" }));
  });

  it("still logs the attempt when an unexpected exception is thrown mid-flight", async () => {
    vi.mocked(verifyPartnerWebhookSignature).mockImplementation(() => {
      throw new Error("decrypt failed: bad auth tag");
    });

    const result = await handleRazorpayPartnerWebhook("{}", "sig");

    expect(result).toEqual({ status: 400 });
    expect(logPaymentWebhook).toHaveBeenCalledWith(
      expect.objectContaining({ errorMessage: "Unhandled exception: decrypt failed: bad auth tag" }),
    );
    expect(applyPaymentEvent).not.toHaveBeenCalled();
  });
});
