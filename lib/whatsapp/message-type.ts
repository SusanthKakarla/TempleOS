import type { WhatsAppMessageType } from "@/types/db";

/**
 * Classifies an inbound webhook message for whatsapp_messages.message_type.
 * Outbound call sites don't need a mapping function — each one already
 * knows which client.ts send function it's calling (sendTextMessage →
 * "text", sendButtonMessage → "button", sendListMessage → "list") and
 * passes that literal directly to logWhatsAppMessage.
 */
export function inboundMessageType(message: {
  type?: string;
  interactive?: { type?: string };
}): WhatsAppMessageType {
  if (message.type === "text") return "text";
  if (message.type === "interactive") {
    if (message.interactive?.type === "button_reply") return "button_reply";
    if (message.interactive?.type === "list_reply") return "list_reply";
  }
  return "unsupported";
}
