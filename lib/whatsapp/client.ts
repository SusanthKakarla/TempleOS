import { GRAPH_API_VERSION } from "./graph-api";

export interface SendMessageResult {
  success: boolean;
  providerMessageId: string | null;
  error?: string;
  /** Meta's stable numeric error code (e.g. 131047) — see lib/whatsapp/errors.ts for classification. */
  errorCode?: number;
}

interface GraphSendResponse {
  messages?: { id: string }[];
  error?: { message?: string; code?: number };
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
        errorCode: json.error?.code,
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

/** Sends an image with a caption — used for birthday/anniversary/donation/festival notifications that have a configured banner. */
export function sendImageMessage(
  phoneNumberId: string,
  toPhone: string,
  imageUrl: string,
  caption: string,
): Promise<SendMessageResult> {
  return sendMessage(phoneNumberId, toPhone, { type: "image", image: { link: imageUrl, caption } });
}

/**
 * Sends up to 3 tappable reply buttons (e.g. the language picker, event
 * announcements). `headerImageUrl` puts an event banner on the same
 * interactive message (Meta supports an image header alongside body text and
 * reply buttons in one send) rather than requiring a second message.
 */
export function sendButtonMessage(
  phoneNumberId: string,
  toPhone: string,
  bodyText: string,
  buttons: InteractiveButton[],
  headerImageUrl?: string,
): Promise<SendMessageResult> {
  return sendMessage(phoneNumberId, toPhone, {
    type: "interactive",
    interactive: {
      type: "button",
      ...(headerImageUrl ? { header: { type: "image", image: { link: headerImageUrl } } } : {}),
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

export interface TemplateHeaderDocument {
  link: string;
  filename: string;
}

/**
 * Sends a Meta-approved WhatsApp Message Template — the only send type Meta
 * allows outside the 24h customer-service window. `bodyParams` are already
 * resolved, ordered positional values (see lib/whatsapp/template-variable-resolver.ts);
 * this is a raw Graph API primitive, same level as the 4 functions above —
 * template lookup/validation/variable-resolution lives in
 * lib/whatsapp/template-client.ts, not here.
 *
 * `headerDocument` attaches a PDF as the template's header component (e.g. a
 * donation receipt) — same "widen the existing header-building logic" pattern
 * sendButtonMessage already uses for image headers. Meta only renders this if
 * the approved template variant actually declares a document header
 * component; sending it to a template that doesn't is safely ignored/rejected
 * by Meta, never a silent breakage.
 */
export function sendTemplateMessage(
  phoneNumberId: string,
  toPhone: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
  headerDocument?: TemplateHeaderDocument,
): Promise<SendMessageResult> {
  const components: Record<string, unknown>[] = [];
  if (headerDocument) {
    components.push({
      type: "header",
      parameters: [{ type: "document", document: { link: headerDocument.link, filename: headerDocument.filename } }],
    });
  }
  if (bodyParams.length > 0) {
    components.push({ type: "body", parameters: bodyParams.map((text) => ({ type: "text", text })) });
  }

  return sendMessage(phoneNumberId, toPhone, {
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}
