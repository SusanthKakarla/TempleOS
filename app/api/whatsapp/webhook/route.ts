import { NextRequest, NextResponse } from "next/server";
import type { SupportedLanguage } from "@/types/db";
import { getWhatsAppAccountByPhoneNumberId } from "@/lib/db/whatsapp-accounts";
import { getTenantById } from "@/lib/db/tenants";
import { upsertDevoteeFromWhatsApp, updateDevoteePreferredLanguage } from "@/lib/db/devotees";
import { logWhatsAppMessage } from "@/lib/db/whatsapp-messages";
import { logWhatsAppInteraction } from "@/lib/db/whatsapp-interactions";
import { listEvents } from "@/lib/db/events";
import { getSpecialDayForDate } from "@/lib/db/temple-special-days";
import { listSevas } from "@/lib/db/temple-sevas";
import { listFaqs } from "@/lib/db/temple-faqs";
import { listSocialLinks } from "@/lib/db/temple-social-links";
import { classifyCommand, classifyInteractiveReplyId, commandToInteractionType } from "@/lib/whatsapp/router";
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

interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string };
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: InboundMessage[];
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
  tenantId: string,
  templeWhatsAppPhone: string,
  message: InboundMessage,
  contactName: string | undefined,
) {
  if (!message.from) return;

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
    status: "received",
    providerMessageId: null,
  });

  await logWhatsAppInteraction(tenantId, devotee.id, interactionType);

  const tenant = await getTenantById(tenantId);
  if (!tenant) return;

  let sendResult: SendMessageResult;
  let loggedBody: string;

  if (command === "select_language_en" || command === "select_language_te") {
    const lang: SupportedLanguage = command === "select_language_en" ? "en" : "te";
    await updateDevoteePreferredLanguage(tenantId, devotee.id, lang);
    const menu = buildMenuMessage(tenant, lang);
    sendResult = await sendListMessage(devoteePhone, menu.body, menu.buttonLabel, menu.sections);
    loggedBody = menu.body;
  } else if (command === "change_language" || devotee.preferredLanguage === null) {
    // First-time devotees must choose a language before anything else, even
    // if their very first message was a concrete command like "events".
    const picker = buildLanguagePickerMessage();
    sendResult = await sendButtonMessage(devoteePhone, picker.body, picker.buttons);
    loggedBody = picker.body;
  } else {
    const lang = devotee.preferredLanguage;
    if (command === "menu") {
      const menu = buildMenuMessage(tenant, lang);
      sendResult = await sendListMessage(devoteePhone, menu.body, menu.buttonLabel, menu.sections);
      loggedBody = menu.body;
    } else {
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
      sendResult = await sendTextMessage(devoteePhone, replyText);
      loggedBody = replyText;
    }
  }

  await logWhatsAppMessage(tenantId, {
    devoteeId: devotee.id,
    direction: "outbound",
    fromPhone: templeWhatsAppPhone,
    toPhone: devoteePhone,
    body: loggedBody,
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
      if (!phoneNumberId || messages.length === 0) continue;

      const account = await getWhatsAppAccountByPhoneNumberId(phoneNumberId);
      if (!account) continue; // unrecognized WhatsApp number; nothing we can do

      for (const message of messages) {
        const contactName = value?.contacts?.find((c) => c.wa_id === message.from)?.profile?.name;
        try {
          await handleInboundMessage(account.tenantId, account.phoneNumber, message, contactName);
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
