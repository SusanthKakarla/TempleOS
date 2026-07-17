import { NextRequest, NextResponse } from "next/server";
import { getWhatsAppAccountByPhoneNumberId } from "@/lib/db/whatsapp-accounts";
import { getTenantById } from "@/lib/db/tenants";
import { upsertDevoteeFromWhatsApp } from "@/lib/db/devotees";
import { logWhatsAppMessage } from "@/lib/db/whatsapp-messages";
import { logWhatsAppInteraction } from "@/lib/db/whatsapp-interactions";
import { listEvents } from "@/lib/db/events";
import { classifyCommand, commandToInteractionType } from "@/lib/whatsapp/router";
import {
  buildContactMessage,
  buildEventsMessage,
  buildMenuMessage,
  buildUnknownMessage,
} from "@/lib/whatsapp/templates";
import { sendTextMessage } from "@/lib/whatsapp/client";
import { normalizeWhatsAppId } from "@/lib/phone.mts";

// Meta webhook payload shape (subset we use). See:
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
interface InboundMessage {
  from?: string;
  type?: string;
  text?: { body?: string };
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
  const bodyText = message.type === "text" ? (message.text?.body ?? "") : "";
  const command = classifyCommand(bodyText);
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
    body: bodyText || `[${message.type ?? "unsupported"} message]`,
    status: "received",
    providerMessageId: null,
  });

  await logWhatsAppInteraction(tenantId, devotee.id, interactionType);

  const tenant = await getTenantById(tenantId);
  if (!tenant) return;

  let replyText: string;
  if (command === "events") {
    const events = await listEvents(tenantId, { status: "published", upcomingOnly: true });
    replyText = buildEventsMessage(tenant, events);
  } else if (command === "contact") {
    replyText = buildContactMessage(tenant);
  } else if (command === "menu") {
    replyText = buildMenuMessage(tenant);
  } else {
    replyText = buildUnknownMessage();
  }

  const sendResult = await sendTextMessage(devoteePhone, replyText);
  await logWhatsAppMessage(tenantId, {
    devoteeId: devotee.id,
    direction: "outbound",
    fromPhone: templeWhatsAppPhone,
    toPhone: devoteePhone,
    body: replyText,
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
