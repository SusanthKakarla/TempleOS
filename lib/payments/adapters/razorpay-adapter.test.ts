import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { razorpayAdapter } from "./razorpay-adapter";
import type { DecryptedCredentials } from "../provider";

const creds: DecryptedCredentials = {
  mode: "api_key",
  keyId: "rzp_test_abc123",
  keySecret: "test_key_secret",
  webhookSecret: "test_webhook_secret",
};

const oauthCreds: DecryptedCredentials = {
  mode: "oauth",
  accessToken: "test_access_token",
  refreshToken: "test_refresh_token",
  accessTokenExpiresAt: new Date().toISOString(),
  publicToken: "test_public_token",
  webhookSecret: "test_webhook_secret",
};

describe("razorpayAdapter.validateCredentials", () => {
  afterEach(() => {
    vi.doUnmock("razorpay");
    vi.resetModules();
  });

  it("surfaces the Razorpay API's own error description, not a generic fallback", async () => {
    vi.doMock("razorpay", () => ({
      default: class MockRazorpay {
        orders = {
          all: vi.fn().mockRejectedValue({
            statusCode: 401,
            error: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" },
          }),
        };
      },
    }));
    const { razorpayAdapter: adapter } = await import("./razorpay-adapter");
    const result = await adapter.validateCredentials(creds);
    expect(result).toEqual({
      ok: false,
      error: "Authentication failed",
      statusCode: 401,
      response: null,
      razorpayError: { code: "BAD_REQUEST_ERROR", description: "Authentication failed" },
    });
  });

  it("falls back to a status-code message when the thrown value has no description", async () => {
    vi.doMock("razorpay", () => ({
      default: class MockRazorpay {
        orders = { all: vi.fn().mockRejectedValue({ statusCode: 500 }) };
      },
    }));
    const { razorpayAdapter: adapter } = await import("./razorpay-adapter");
    const result = await adapter.validateCredentials(creds);
    expect(result).toEqual({
      ok: false,
      error: "Razorpay API request failed with status 500",
      statusCode: 500,
      response: null,
      razorpayError: null,
    });
  });

  it("falls back to the fully generic message when nothing at all is identifiable", async () => {
    vi.doMock("razorpay", () => ({
      default: class MockRazorpay {
        orders = { all: vi.fn().mockRejectedValue({}) };
      },
    }));
    const { razorpayAdapter: adapter } = await import("./razorpay-adapter");
    const result = await adapter.validateCredentials(creds);
    expect(result).toEqual({
      ok: false,
      error: "Could not verify Razorpay credentials",
      statusCode: null,
      response: null,
      razorpayError: null,
    });
  });

  it("surfaces a plain Error's message (e.g. a network failure) instead of the generic fallback", async () => {
    vi.doMock("razorpay", () => ({
      default: class MockRazorpay {
        orders = { all: vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND api.razorpay.com")) };
      },
    }));
    const { razorpayAdapter: adapter } = await import("./razorpay-adapter");
    const result = await adapter.validateCredentials(creds);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("getaddrinfo ENOTFOUND api.razorpay.com");
      expect(result.statusCode).toBeNull();
    }
  });

  it("returns ok: true when the API call succeeds", async () => {
    vi.doMock("razorpay", () => ({
      default: class MockRazorpay {
        orders = { all: vi.fn().mockResolvedValue({ items: [] }) };
      },
    }));
    const { razorpayAdapter: adapter } = await import("./razorpay-adapter");
    const result = await adapter.validateCredentials(creds);
    expect(result).toEqual({ ok: true });
  });
});

describe("razorpayAdapter.verifyCheckoutSignature", () => {
  it("accepts a signature computed as HMAC-SHA256(orderId|paymentId, keySecret)", () => {
    const providerOrderId = "order_abc";
    const providerPaymentId = "pay_xyz";
    const signature = createHmac("sha256", creds.keySecret).update(`${providerOrderId}|${providerPaymentId}`).digest("hex");

    expect(razorpayAdapter.verifyCheckoutSignature(creds, { providerOrderId, providerPaymentId, signature })).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    const providerOrderId = "order_abc";
    const providerPaymentId = "pay_xyz";
    const signature = createHmac("sha256", "wrong_secret").update(`${providerOrderId}|${providerPaymentId}`).digest("hex");

    expect(razorpayAdapter.verifyCheckoutSignature(creds, { providerOrderId, providerPaymentId, signature })).toBe(false);
  });

  it("rejects a signature for a different order/payment pair than what was signed", () => {
    const signature = createHmac("sha256", creds.keySecret).update("order_abc|pay_xyz").digest("hex");
    expect(
      razorpayAdapter.verifyCheckoutSignature(creds, {
        providerOrderId: "order_abc",
        providerPaymentId: "pay_DIFFERENT",
        signature,
      }),
    ).toBe(false);
  });
});

describe("razorpayAdapter.verifyCheckoutSignature (OAuth/Partner mode)", () => {
  const originalSecret = process.env.RAZORPAY_PARTNER_CLIENT_SECRET;

  afterEach(() => {
    process.env.RAZORPAY_PARTNER_CLIENT_SECRET = originalSecret;
  });

  it("signs against RAZORPAY_PARTNER_CLIENT_SECRET instead of a per-tenant key secret", () => {
    process.env.RAZORPAY_PARTNER_CLIENT_SECRET = "partner_client_secret";
    const providerOrderId = "order_abc";
    const providerPaymentId = "pay_xyz";
    const signature = createHmac("sha256", "partner_client_secret").update(`${providerOrderId}|${providerPaymentId}`).digest("hex");

    expect(razorpayAdapter.verifyCheckoutSignature(oauthCreds, { providerOrderId, providerPaymentId, signature })).toBe(true);
  });

  it("returns false when RAZORPAY_PARTNER_CLIENT_SECRET is not configured", () => {
    delete process.env.RAZORPAY_PARTNER_CLIENT_SECRET;
    const signature = createHmac("sha256", "anything").update("order_abc|pay_xyz").digest("hex");
    expect(
      razorpayAdapter.verifyCheckoutSignature(oauthCreds, { providerOrderId: "order_abc", providerPaymentId: "pay_xyz", signature }),
    ).toBe(false);
  });
});

describe("razorpayAdapter.verifyWebhookSignature", () => {
  it("accepts a signature computed as HMAC-SHA256(rawBody, webhookSecret)", () => {
    const rawBody = JSON.stringify({ event: "payment.captured" });
    const signature = createHmac("sha256", creds.webhookSecret!).update(rawBody).digest("hex");
    expect(razorpayAdapter.verifyWebhookSignature(creds, rawBody, signature)).toBe(true);
  });

  it("rejects when the body was tampered with after signing", () => {
    const originalBody = JSON.stringify({ event: "payment.captured", amount: 100 });
    const signature = createHmac("sha256", creds.webhookSecret!).update(originalBody).digest("hex");
    const tamperedBody = JSON.stringify({ event: "payment.captured", amount: 999999 });
    expect(razorpayAdapter.verifyWebhookSignature(creds, tamperedBody, signature)).toBe(false);
  });

  it("returns false (never throws) when no webhook secret is configured", () => {
    const noWebhookSecretCreds: DecryptedCredentials = { ...creds, webhookSecret: null };
    expect(razorpayAdapter.verifyWebhookSignature(noWebhookSecretCreds, "{}", "anything")).toBe(false);
  });
});

describe("razorpayAdapter.parseWebhookEvent", () => {
  it("parses a payment.captured event", () => {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_123", order_id: "order_456", amount: 50000 } } },
    });
    const event = razorpayAdapter.parseWebhookEvent(rawBody);
    expect(event).toEqual({
      type: "payment.captured",
      providerOrderId: "order_456",
      providerPaymentId: "pay_123",
      providerRefundId: null,
      amountPaise: 50000,
      providerAccountId: null,
    });
  });

  it("extracts account_id for a Partner (OAuth) webhook event", () => {
    const rawBody = JSON.stringify({
      event: "payment.captured",
      account_id: "acc_partner_123",
      payload: { payment: { entity: { id: "pay_123", order_id: "order_456", amount: 50000 } } },
    });
    const event = razorpayAdapter.parseWebhookEvent(rawBody);
    expect(event.providerAccountId).toBe("acc_partner_123");
  });

  it("parses a refund.processed event", () => {
    const rawBody = JSON.stringify({
      event: "refund.processed",
      payload: { refund: { entity: { id: "rfnd_1", payment_id: "pay_123", amount: 20000 } } },
    });
    const event = razorpayAdapter.parseWebhookEvent(rawBody);
    expect(event.type).toBe("refund.processed");
    expect(event.providerPaymentId).toBe("pay_123");
    expect(event.providerRefundId).toBe("rfnd_1");
  });

  it("parses a refund.failed event", () => {
    const rawBody = JSON.stringify({
      event: "refund.failed",
      payload: { refund: { entity: { id: "rfnd_2", payment_id: "pay_456", amount: 10000 } } },
    });
    const event = razorpayAdapter.parseWebhookEvent(rawBody);
    expect(event.type).toBe("refund.failed");
    expect(event.providerRefundId).toBe("rfnd_2");
  });

  it("parses a payment_link.paid event (never emitted by this app today, kept for forward-compatibility)", () => {
    const rawBody = JSON.stringify({
      event: "payment_link.paid",
      payload: { payment: { entity: { id: "pay_789", order_id: "order_789", amount: 30000 } } },
    });
    const event = razorpayAdapter.parseWebhookEvent(rawBody);
    expect(event.type).toBe("payment.link.paid");
    expect(event.providerOrderId).toBe("order_789");
  });

  it("returns an all-null event for malformed JSON instead of throwing", () => {
    const event = razorpayAdapter.parseWebhookEvent("not json");
    expect(event).toEqual({
      type: null,
      providerOrderId: null,
      providerPaymentId: null,
      providerRefundId: null,
      amountPaise: null,
      providerAccountId: null,
    });
  });

  it("returns type: null for an unrecognized event name", () => {
    const event = razorpayAdapter.parseWebhookEvent(JSON.stringify({ event: "subscription.activated" }));
    expect(event.type).toBeNull();
  });
});
