import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendButtonMessage, sendImageMessage, sendTemplateMessage } from "./client";

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

describe("sendTemplateMessage", () => {
  beforeEach(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ messages: [{ id: "wamid.3" }] })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds a template payload with positional body params", async () => {
    const result = await sendTemplateMessage("phone-id", "+919876543210", "welcome_user_v1", "en", [
      "Sri Venkateswara Temple",
      "Priya",
    ]);

    expect(result.success).toBe(true);
    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.type).toBe("template");
    expect(body.template).toEqual({
      name: "welcome_user_v1",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Sri Venkateswara Temple" },
            { type: "text", text: "Priya" },
          ],
        },
      ],
    });
  });

  it("omits components entirely for a template with no variables", async () => {
    await sendTemplateMessage("phone-id", "+919876543210", "no_variables_template", "en", []);

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.template.components).toBeUndefined();
  });

  it("adds a document header when a receipt attachment is given", async () => {
    await sendTemplateMessage("phone-id", "+919876543210", "donation_receipt_v1", "en", ["Sri Venkateswara Temple"], {
      link: "https://cdn.example/receipts/R-1.pdf",
      filename: "R-1.pdf",
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.template.components).toEqual([
      {
        type: "header",
        parameters: [{ type: "document", document: { link: "https://cdn.example/receipts/R-1.pdf", filename: "R-1.pdf" } }],
      },
      { type: "body", parameters: [{ type: "text", text: "Sri Venkateswara Temple" }] },
    ]);
  });

  it("sends only the document header when there are no body variables", async () => {
    await sendTemplateMessage("phone-id", "+919876543210", "donation_receipt_v1", "en", [], {
      link: "https://cdn.example/receipts/R-1.pdf",
      filename: "R-1.pdf",
    });

    const [, init] = vi.mocked(fetch).mock.calls[0];
    const body = JSON.parse(init!.body as string);
    expect(body.template.components).toEqual([
      {
        type: "header",
        parameters: [{ type: "document", document: { link: "https://cdn.example/receipts/R-1.pdf", filename: "R-1.pdf" } }],
      },
    ]);
  });

  it("surfaces Meta's structured error code on failure, same as the other send functions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ error: { message: "Template name does not exist", code: 132001 } }, false),
      ),
    );

    const result = await sendTemplateMessage("phone-id", "+919876543210", "does_not_exist", "en", []);
    expect(result.success).toBe(false);
    expect(result.errorCode).toBe(132001);
  });
});
