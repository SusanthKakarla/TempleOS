import { getEventById } from "@/lib/db/events";
import { getTenantById } from "@/lib/db/tenants";
import { getDevoteeById } from "@/lib/db/devotees";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { logWhatsAppMessage } from "@/lib/db/whatsapp-messages";
import {
  claimEventNotification,
  markEventNotificationFailed,
  markEventNotificationSent,
} from "@/lib/db/event-notifications";
import { buildEventNotificationMessage } from "./templates";
import { sendButtonMessage } from "./client";

/**
 * Sends every given event_notifications row. Called both from the event
 * PATCH route's after() (scoped to just-enqueued ids for one event) and the
 * cron sweep (scoped to whatever's due across all tenants) — the caller
 * decides which ids to process, this just processes them one at a time.
 */
export async function processEventNotifications(ids: string[]): Promise<void> {
  for (const id of ids) {
    await processOneEventNotification(id);
  }
}

async function processOneEventNotification(id: string): Promise<void> {
  const claimed = await claimEventNotification(id);
  if (!claimed) return; // already handled elsewhere, or not actually due

  const [tenant, event, devotee, whatsappAccount] = await Promise.all([
    getTenantById(claimed.tenantId),
    getEventById(claimed.tenantId, claimed.eventId),
    getDevoteeById(claimed.tenantId, claimed.devoteeId),
    getWhatsAppAccountByTenant(claimed.tenantId),
  ]);
  if (!tenant || !event || !devotee || !whatsappAccount) {
    await markEventNotificationFailed(claimed.id, claimed.attemptCount, "Referenced record no longer exists");
    return;
  }

  const lang = devotee.preferredLanguage ?? "en";
  const message = buildEventNotificationMessage(claimed.notificationType, tenant, event, lang);
  const result = await sendButtonMessage(devotee.whatsappPhone, message.body, message.buttons);
  const logged = await logWhatsAppMessage(claimed.tenantId, {
    devoteeId: devotee.id,
    direction: "outbound",
    fromPhone: whatsappAccount.phoneNumber,
    toPhone: devotee.whatsappPhone,
    body: message.body,
    status: result.success ? "sent" : "failed",
    providerMessageId: result.providerMessageId,
  });

  if (result.success) {
    await markEventNotificationSent(claimed.id, logged.id);
  } else {
    await markEventNotificationFailed(claimed.id, claimed.attemptCount, result.error ?? "Unknown send error");
  }
}
