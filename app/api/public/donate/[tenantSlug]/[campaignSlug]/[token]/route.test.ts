import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCheckoutOrder } from "@/lib/payments/donation-checkout-service";
import { POST } from "./route";

vi.mock("@/lib/payments/donation-checkout-service", () => ({ createCheckoutOrder: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: vi.fn().mockReturnValue(false), getClientIp: vi.fn().mockReturnValue("unknown") }));

function request(body: unknown): Request {
  return new Request("http://localhost/api/public/donate/sri-temple/annadanam-fund/token-abc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context() {
  return { params: Promise.resolve({ tenantSlug: "sri-temple", campaignSlug: "annadanam-fund", token: "token-abc" }) };
}

const validBody = { amount: 501, donorName: "Ravi Kumar", donorPhone: "+919876543210", isAnonymous: false };

describe("POST /api/public/donate/[tenantSlug]/[campaignSlug]/[token]", () => {
  beforeEach(() => {
    vi.mocked(createCheckoutOrder).mockReset();
  });

  it("returns the order fields on success", async () => {
    vi.mocked(createCheckoutOrder).mockResolvedValue({
      transaction: { id: "txn-1", amount: 501, providerKey: "razorpay" } as never,
      providerOrderId: "order_abc",
      keyId: "rzp_test_abc",
      currency: "INR",
      redirectUrl: null,
    });

    const res = await POST(request(validBody) as never, context());
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({
      orderId: "order_abc",
      keyId: "rzp_test_abc",
      amount: 501,
      currency: "INR",
      transactionId: "txn-1",
      providerKey: "razorpay",
      redirectUrl: null,
    });
  });

  it("returns a generic 404 when the campaign/link genuinely isn't available", async () => {
    vi.mocked(createCheckoutOrder).mockResolvedValue(null);

    const res = await POST(request(validBody) as never, context());
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe("This donation link isn't available.");
  });

  it("returns a distinct 502 (not the 'link unavailable' message) when order creation throws — e.g. a Razorpay API failure", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createCheckoutOrder).mockRejectedValue(new Error("Authentication failed"));

    const res = await POST(request(validBody) as never, context());
    const json = await res.json();

    expect(res.status).toBe(502);
    expect(json.error).toBe("We couldn't start your payment right now. Please try again in a moment.");
    expect(json.error).not.toContain("isn't available");
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "[public-donate:create-order] Payment order creation failed",
      expect.objectContaining({ message: "Authentication failed" }),
    );
    consoleErrorSpy.mockRestore();
  });

  it("rejects invalid input before ever calling createCheckoutOrder", async () => {
    const res = await POST(request({ amount: -5 }) as never, context());
    expect(res.status).toBe(400);
    expect(createCheckoutOrder).not.toHaveBeenCalled();
  });
});
