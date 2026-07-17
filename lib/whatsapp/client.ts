const GRAPH_API_VERSION = "v21.0";

export interface SendTextMessageResult {
  success: boolean;
  providerMessageId: string | null;
  error?: string;
}

interface GraphSendResponse {
  messages?: { id: string }[];
  error?: { message?: string };
}

/** Sends a text message via the Meta WhatsApp Cloud API. */
export async function sendTextMessage(toPhone: string, body: string): Promise<SendTextMessageResult> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
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
          type: "text",
          text: { body },
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
