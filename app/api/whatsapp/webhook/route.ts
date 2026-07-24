import { NextRequest, NextResponse } from "next/server";
import type { SupportedLanguage, WhatsAppAccount, WhatsAppMessageType } from "@/types/db";
import { getWhatsAppAccountByPhoneNumberId } from "@/lib/db/whatsapp-accounts";
import { getTenantById } from "@/lib/db/tenants";
import { upsertDevoteeFromWhatsApp, updateDevoteePreferredLanguage } from "@/lib/db/devotees";
import { logWhatsAppMessage } from "@/lib/db/whatsapp-messages";
import { logWhatsAppInteraction } from "@/lib/db/whatsapp-interactions";
import { applyWebhookDeliveryStatus } from "@/lib/notifications/delivery";
import { listEvents } from "@/lib/db/events";
import { getSpecialDayForDate } from "@/lib/db/temple-special-days";
import { listSevas } from "@/lib/db/temple-sevas";
import { listFaqs } from "@/lib/db/temple-faqs";
import { listSocialLinks } from "@/lib/db/temple-social-links";
import { classifyCommand, classifyInteractiveReplyId, commandToInteractionType } from "@/lib/whatsapp/router";
import { inboundMessageType } from "@/lib/whatsapp/message-type";
import {
  buildContactMessage,
  buildDonationInfoMessage,
  buildEventsMessage,
  buildFaqMessage,
  buildHelpMessage,
  buildHistoryMessage,
  buildLanguagePickerMessage,
  buildMenuMessage,
  buildSevasMessage,
  buildTimingsMessage,
  buildUnknownMessage,
  getTenantLocalDateISO,
} from "@/lib/whatsapp/templates";
import { sendButtonMessage, sendListMessage, sendTextMessage, type SendMessageResult } from "@/lib/whatsapp/client";
import { normalizeWhatsAppId } from "@/lib/phone.mts";

// Meta webhook payload shape (subset we use). See:
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
interface InboundMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
  // Inbound tap on an interactive message we sent. Note: these type strings
  // ("button_reply"/"list_reply") differ from the outbound interactive.type
  // values ("button"/"list") we send in client.ts.
  interactive?: {
    type?: string;
    button_reply?: { id?: string; title?: string };
    list_reply?: { id?: string; title?: string };
  };
}

// Meta's asynchronous delivery-status callback — separate from (and can
// arrive in a payload alongside or instead of) the inbound `messages` array
// above. `id` is the same WAMID markNotificationSent stored as
// provider_message_id at send time.
interface StatusUpdate {
  id?: string;
  status?: string;
  errors?: Array<{ code?: number; title?: string; message?: string }>;
}

const KNOWN_STATUSES = new Set(["sent", "delivered", "read", "failed"]);

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: InboundMessage[];
        statuses?: StatusUpdate[];
      };
    }>;
  }>;
}

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get("hub.mode");
  const token = req.nextUrl.searchParams.get("hub.verify_token");
  const challenge = req.nextUrl.searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

async function handleInboundMessage(
  account: WhatsAppAccount,
  message: InboundMessage,
  contactName: string | undefined,
) {
  if (!message.from) return;

  const tenantId = account.tenantId;
  const templeWhatsAppPhone = account.phoneNumber;

  const devoteePhone = normalizeWhatsAppId(message.from);
  const interactiveReplyId = message.interactive?.button_reply?.id ?? message.interactive?.list_reply?.id;
  const interactiveReplyTitle =
    message.interactive?.button_reply?.title ?? message.interactive?.list_reply?.title;
  const bodyText = message.type === "text" ? (message.text?.body ?? "") : "";
  const command =
    message.type === "interactive" ? classifyInteractiveReplyId(interactiveReplyId) : classifyCommand(bodyText);
  const interactionType = commandToInteractionType(command);

  const devotee = await upsertDevoteeFromWhatsApp(tenantId, {
    whatsappPhone: devoteePhone,
    displayName: contactName ?? devoteePhone,
    lastInteractionType: interactionType,
  });

  await logWhatsAppMessage(tenantId, {
    devoteeId: devotee.id,
    direction: "inbound",
    fromPhone: devoteePhone,
    toPhone: templeWhatsAppPhone,
    body: interactiveReplyTitle ?? bodyText ?? `[${message.type ?? "unsupported"} message]`,
    messageType: inboundMessageType(message),
    status: "received",
    providerMessageId: null,
  });

  await logWhatsAppInteraction(tenantId, devotee.id, interactionType);

  const tenant = await getTenantById(tenantId);
  if (!tenant) return;

  let sendResult: SendMessageResult;
  let loggedBody: string;
  let messageType: WhatsAppMessageType;

  if (command === "select_language_en" || command === "select_language_te") {
    const lang: SupportedLanguage = command === "select_language_en" ? "en" : "te";
    await updateDevoteePreferredLanguage(tenantId, devotee.id, lang);
    const menu = buildMenuMessage(tenant, lang);
    sendResult = await sendListMessage(account.metaPhoneNumberId, devoteePhone, menu.body, menu.buttonLabel, menu.sections);
    loggedBody = menu.body;
    messageType = "list";
  } else if (command === "change_language" || devotee.preferredLanguage === null) {
    // First-time devotees must choose a language before anything else, even
    // if their very first message was a concrete command like "events".
    const picker = buildLanguagePickerMessage();
    sendResult = await sendButtonMessage(account.metaPhoneNumberId, devoteePhone, picker.body, picker.buttons);
    loggedBody = picker.body;
    messageType = "button";
  } else {
    const lang = devotee.preferredLanguage;
    if (command === "menu") {
      const menu = buildMenuMessage(tenant, lang);
      sendResult = await sendListMessage(account.metaPhoneNumberId, devoteePhone, menu.body, menu.buttonLabel, menu.sections);
      loggedBody = menu.body;
      messageType = "list";
    } else {
      messageType = "text";
      let replyText: string;
      if (command === "events") {
        const events = await listEvents(tenantId, { status: "published", upcomingOnly: true });
        replyText = buildEventsMessage(tenant, events, lang);
      } else if (command === "contact") {
        const socialLinks = await listSocialLinks(tenantId);
        replyText = buildContactMessage(tenant, lang, socialLinks);
      } else if (command === "timings") {
        const todayIso = getTenantLocalDateISO(tenant.timezone);
        const specialDay = await getSpecialDayForDate(tenantId, todayIso);
        replyText = buildTimingsMessage(tenant, specialDay, lang);
      } else if (command === "history") {
        replyText = buildHistoryMessage(tenant, lang);
      } else if (command === "sevas") {
        const sevas = await listSevas(tenantId);
        replyText = buildSevasMessage(tenant, sevas, lang);
      } else if (command === "faq") {
        const faqs = await listFaqs(tenantId);
        replyText = buildFaqMessage(tenant, faqs, lang);
      } else if (command === "donation_info") {
        replyText = buildDonationInfoMessage(tenant, lang);
      } else if (command === "help") {
        replyText = buildHelpMessage(tenant, lang);
      } else {
        replyText = buildUnknownMessage(lang);
      }
      sendResult = await sendTextMessage(account.metaPhoneNumberId, devoteePhone, replyText);
      loggedBody = replyText;
    }
  }

  await logWhatsAppMessage(tenantId, {
    devoteeId: devotee.id,
    direction: "outbound",
    fromPhone: templeWhatsAppPhone,
    toPhone: devoteePhone,
    body: loggedBody,
    messageType,
    status: sendResult.success ? "sent" : "failed",
    providerMessageId: sendResult.providerMessageId,
  });
}

export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as WhatsAppWebhookPayload | null;
  if (!payload) {
    return NextResponse.json({ ok: true });
  }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      const messages = value?.messages ?? [];
      const statuses = value?.statuses ?? [];
      if (!phoneNumberId) continue;

      for (const statusUpdate of statuses) {
        if (!statusUpdate.id || !statusUpdate.status || !KNOWN_STATUSES.has(statusUpdate.status)) continue;
        const errorReason = statusUpdate.errors?.[0]?.message ?? statusUpdate.errors?.[0]?.title;
        const errorCode = statusUpdate.errors?.[0]?.code;
        try {
          await applyWebhookDeliveryStatus(
            statusUpdate.id,
            statusUpdate.status as "sent" | "delivered" | "read" | "failed",
            errorReason,
            errorCode,
          );
        } catch (err) {
          // One malformed/failed status update should not fail the whole
          // webhook delivery (Meta retries the entire payload on non-2xx).
          console.error("Failed to process WhatsApp status update", err);
        }
      }

      if (messages.length === 0) continue;

      const account = await getWhatsAppAccountByPhoneNumberId(phoneNumberId);
      if (!account) continue; // unrecognized WhatsApp number; nothing we can do

      for (const message of messages) {
        const contactName = value?.contacts?.find((c) => c.wa_id === message.from)?.profile?.name;
        try {
          await handleInboundMessage(account, message, contactName);
        } catch (err) {
          // One malformed/failed message should not fail the whole webhook
          // delivery (Meta retries the entire payload on non-2xx).
          console.error("Failed to process inbound WhatsApp message", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
