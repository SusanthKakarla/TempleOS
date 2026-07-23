import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendButtonMessage, sendImageMessage } from "./client";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 400, json: async () => body } as Response;
}

describe("sendImageMessage", () => {
  beforeEach(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ messages: [{ id: "wamid.1" }] })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends an image message with a link and caption", async () => {
    const result = await sendImageMessage("phone-id", "+919876543210", "https://cdn.example/banner.jpg", "Happy Birthday!");

    expect(result.success).toBe(true);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.type).toBe("image");
    expect(body.image).toEqual({ link: "https://cdn.example/banner.jpg", caption: "Happy Birthday!" });
  });

  it("fails without configured credentials rather than throwing", async () => {
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const result = await sendImageMessage("phone-id", "+919876543210", "https://cdn.example/banner.jpg", "Hi");
    expect(result).toEqual({
      success: false,
      providerMessageId: null,
      error: "WhatsApp credentials are not configured",
    });
  });
});

describe("sendButtonMessage", () => {
  beforeEach(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ messages: [{ id: "wamid.2" }] })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("omits the header when no image is given — existing event notifications stay unchanged", async () => {
    await sendButtonMessage("phone-id", "+919876543210", "New event!", [{ id: "events", title: "View" }]);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.interactive.header).toBeUndefined();
    expect(body.interactive.body).toEqual({ text: "New event!" });
  });

  it("adds an image header when a banner url is given", async () => {
    await sendButtonMessage(
      "phone-id",
      "+919876543210",
      "New event!",
      [{ id: "events", title: "View" }],
      "https://cdn.example/banner.jpg",
    );

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.interactive.header).toEqual({ type: "image", image: { link: "https://cdn.example/banner.jpg" } });
  });
});
