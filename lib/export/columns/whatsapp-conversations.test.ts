import { describe, expect, it } from "vitest";
import type { ConversationSummary } from "@/types/db";
import { CONVERSATION_EXPORT_COLUMNS } from "./whatsapp-conversations";

function makeConversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    devoteeId: "devotee-1",
    displayName: "Ravi Kumar",
    whatsappPhone: "+919876500000",
    isDonor: false,
    preferredLanguage: "en",
    whatsappOptInStatus: true,
    lastSeenAt: "2026-01-02T00:00:00.000Z",
    lastMessagePreview: "Namaste",
    lastMessageAt: "2026-01-02T00:00:00.000Z",
    lastDirection: "inbound",
    unreadCount: 2,
    ...overrides,
  };
}

function accessorFor(key: string) {
  const column = CONVERSATION_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!column) throw new Error(`No export column with key "${key}"`);
  return column.accessor;
}

describe("CONVERSATION_EXPORT_COLUMNS", () => {
  it("passes the last message preview through verbatim", () => {
    expect(accessorFor("lastMessagePreview")(makeConversation({ lastMessagePreview: "Har Har Mahadev" }))).toBe(
      "Har Har Mahadev",
    );
  });

  it("falls back to an em dash when there's no last message yet", () => {
    expect(accessorFor("lastMessagePreview")(makeConversation({ lastMessagePreview: null, lastMessageAt: null }))).toBe(
      "—",
    );
    expect(accessorFor("lastMessageAt")(makeConversation({ lastMessageAt: null }))).toBe("—");
  });

  it("reports the unread count as a number", () => {
    expect(accessorFor("unreadCount")(makeConversation({ unreadCount: 3 }))).toBe(3);
  });
});
