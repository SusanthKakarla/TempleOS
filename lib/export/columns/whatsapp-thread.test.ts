import { describe, expect, it } from "vitest";
import type { WhatsAppMessage } from "@/types/db";
import { WHATSAPP_THREAD_EXPORT_COLUMNS } from "./whatsapp-thread";

function makeMessage(overrides: Partial<WhatsAppMessage> = {}): WhatsAppMessage {
  return {
    id: "message-1",
    tenantId: "tenant-1",
    devoteeId: "devotee-1",
    direction: "inbound",
    fromPhone: "+919876500000",
    toPhone: "+917995362200",
    body: "Namaste",
    messageType: "text",
    providerMessageId: null,
    status: "received",
    receivedAt: "2026-01-01T00:00:00.000Z",
    sentAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function accessorFor(key: string) {
  const column = WHATSAPP_THREAD_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!column) throw new Error(`No export column with key "${key}"`);
  return column.accessor;
}

describe("WHATSAPP_THREAD_EXPORT_COLUMNS", () => {
  it("labels direction in devotee-facing terms rather than raw inbound/outbound", () => {
    expect(accessorFor("direction")(makeMessage({ direction: "inbound" }))).toBe("Devotee");
    expect(accessorFor("direction")(makeMessage({ direction: "outbound" }))).toBe("Temple");
  });

  it("passes the message body through verbatim", () => {
    expect(accessorFor("body")(makeMessage({ body: "Har Har Mahadev" }))).toBe("Har Har Mahadev");
  });

  it("reports message type and status verbatim", () => {
    expect(accessorFor("messageType")(makeMessage({ messageType: "button_reply" }))).toBe("button_reply");
    expect(accessorFor("status")(makeMessage({ status: "failed" }))).toBe("failed");
  });
});
