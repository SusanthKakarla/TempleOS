import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { razorpayAdapter } from "./razorpay-adapter";
import type { DecryptedCredentials } from "../provider";

const creds: DecryptedCredentials = {
  keyId: "rzp_test_abc123",
  keySecret: "test_key_secret",
  webhookSecret: "test_webhook_secret",
};

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
    });
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

  it("returns an all-null event for malformed JSON instead of throwing", () => {
    const event = razorpayAdapter.parseWebhookEvent("not json");
    expect(event).toEqual({ type: null, providerOrderId: null, providerPaymentId: null, providerRefundId: null, amountPaise: null });
  });

  it("returns type: null for an unrecognized event name", () => {
    const event = razorpayAdapter.parseWebhookEvent(JSON.stringify({ event: "subscription.activated" }));
    expect(event.type).toBeNull();
  });
});
