import { GRAPH_API_VERSION } from "./graph-api";

export interface SendMessageResult {
  success: boolean;
  providerMessageId: string | null;
  error?: string;
}

interface GraphSendResponse {
  messages?: { id: string }[];
  error?: { message?: string };
}

export interface InteractiveButton {
  id: string;
  title: string; // Meta limit: 20 chars
}

export interface InteractiveListRow {
  id: string;
  title: string; // Meta limit: 24 chars
  description?: string; // Meta limit: 72 chars
}

export interface InteractiveListSection {
  title: string;
  rows: InteractiveListRow[];
}

/** Shared send path for every message type — credential check, fetch, response parsing. */
async function sendMessage(
  phoneNumberId: string,
  toPhone: string,
  messageFields: Record<string, unknown>,
): Promise<SendMessageResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken || !phoneNumberId) {
    return {
      success: false,
      providerMessageId: null,
      error: "WhatsApp credentials are not configured",
    };
  }

  // Meta expects the recipient as digits only, no leading "+".
  const toDigits = toPhone.replace(/[^\d]/g, "");

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: toDigits,
          ...messageFields,
        }),
      },
    );

    const json = (await response.json().catch(() => ({}))) as GraphSendResponse;

    if (!response.ok) {
      return {
        success: false,
        providerMessageId: null,
        error: json.error?.message ?? `HTTP ${response.status}`,
      };
    }

    return { success: true, providerMessageId: json.messages?.[0]?.id ?? null };
  } catch (err) {
    return {
      success: false,
      providerMessageId: null,
      error: err instanceof Error ? err.message : "Unknown error sending WhatsApp message",
    };
  }
}

/** Sends a plain text message via the Meta WhatsApp Cloud API. */
export function sendTextMessage(phoneNumberId: string, toPhone: string, body: string): Promise<SendMessageResult> {
  return sendMessage(phoneNumberId, toPhone, { type: "text", text: { body } });
}

/** Sends up to 3 tappable reply buttons (e.g. the language picker). */
export function sendButtonMessage(
  phoneNumberId: string,
  toPhone: string,
  bodyText: string,
  buttons: InteractiveButton[],
): Promise<SendMessageResult> {
  return sendMessage(phoneNumberId, toPhone, {
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({ type: "reply", reply: { id: b.id, title: b.title } })),
      },
    },
  });
}

/** Sends a tappable list (up to 10 rows total across sections — the main menu). */
export function sendListMessage(
  phoneNumberId: string,
  toPhone: string,
  bodyText: string,
  buttonLabel: string,
  sections: InteractiveListSection[],
): Promise<SendMessageResult> {
  return sendMessage(phoneNumberId, toPhone, {
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText },
      action: { button: buttonLabel, sections },
    },
  });
}
