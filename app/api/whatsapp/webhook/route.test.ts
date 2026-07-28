import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/db/whatsapp-accounts", () => ({ getWhatsAppAccountByPhoneNumberId: vi.fn() }));
vi.mock("@/lib/db/tenants", () => ({ getTenantById: vi.fn() }));
vi.mock("@/lib/db/devotees", () => ({
  upsertDevoteeFromWhatsApp: vi.fn(),
  updateDevoteePreferredLanguage: vi.fn(),
}));
vi.mock("@/lib/db/whatsapp-messages", () => ({ logWhatsAppMessage: vi.fn() }));
vi.mock("@/lib/db/whatsapp-interactions", () => ({ logWhatsAppInteraction: vi.fn() }));
vi.mock("@/lib/notifications/delivery", () => ({ applyWebhookDeliveryStatus: vi.fn() }));
vi.mock("@/lib/db/events", () => ({ listEvents: vi.fn() }));
vi.mock("@/lib/db/temple-special-days", () => ({ getSpecialDayForDate: vi.fn() }));
vi.mock("@/lib/db/temple-sevas", () => ({ listSevas: vi.fn() }));
vi.mock("@/lib/db/temple-faqs", () => ({ listFaqs: vi.fn() }));
vi.mock("@/lib/db/temple-social-links", () => ({ listSocialLinks: vi.fn() }));
vi.mock("@/lib/whatsapp/client", () => ({
  sendButtonMessage: vi.fn(),
  sendListMessage: vi.fn(),
  sendTextMessage: vi.fn(),
}));

import { GET, POST } from "./route";

function requestWithBody(body: string, signature?: string): NextRequest {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature !== undefined) headers["x-hub-signature-256"] = signature;
  return new NextRequest("http://localhost/api/whatsapp/webhook", { method: "POST", headers, body });
}

function sign(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

describe("WhatsApp webhook POST — signature verification", () => {
  const ORIGINAL_SECRET = process.env.WHATSAPP_APP_SECRET;

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = "test-app-secret";
  });

  afterEach(() => {
    process.env.WHATSAPP_APP_SECRET = ORIGINAL_SECRET;
  });

  it("rejects a request with no X-Hub-Signature-256 header", async () => {
    const res = await POST(requestWithBody("{}"));
    expect(res.status).toBe(401);
  });

  it("rejects a request with an invalid signature", async () => {
    const res = await POST(requestWithBody("{}", "sha256=0000000000000000000000000000000000000000000000000000000000000000"));
    expect(res.status).toBe(401);
  });

  it("rejects any signature when WHATSAPP_APP_SECRET is not configured", async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const res = await POST(requestWithBody("{}", "sha256=deadbeef"));
    expect(res.status).toBe(401);
  });

  it("accepts a request whose signature matches the raw body", async () => {
    const body = JSON.stringify({ entry: [] });
    const res = await POST(requestWithBody(body, sign(body, "test-app-secret")));
    expect(res.status).toBe(200);
  });

  it("rejects when the signature was computed over a different body (tamper detection)", async () => {
    const signedBody = JSON.stringify({ entry: [] });
    const tamperedBody = JSON.stringify({ entry: [{ changes: [] }] });
    const res = await POST(requestWithBody(tamperedBody, sign(signedBody, "test-app-secret")));
    expect(res.status).toBe(401);
  });
});

describe("WhatsApp webhook GET — verify-token handshake", () => {
  const ORIGINAL_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

  beforeEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = "expected-token";
  });

  afterEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = ORIGINAL_TOKEN;
  });

  it("returns the challenge when mode and token match", async () => {
    const url =
      "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=expected-token&hub.challenge=abc123";
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("abc123");
  });

  it("rejects a mismatched token", async () => {
    const url = "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=abc123";
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(403);
  });

  it("rejects when WHATSAPP_VERIFY_TOKEN is not configured", async () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    const url =
      "http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=anything&hub.challenge=abc123";
    const res = await GET(new NextRequest(url));
    expect(res.status).toBe(403);
  });
});
