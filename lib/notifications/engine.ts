import { getDevoteeById } from "@/lib/db/devotees";
import { getPreference } from "@/lib/db/notification-preferences";
import { getTemplate, renderTemplate } from "@/lib/db/notification-templates";
import { createNotification } from "@/lib/db/notifications";
import type { Notification, NotificationCategory, NotificationChannel, NotificationType, SupportedLanguage } from "@/types/db";

type Recipient = { personId: string } | { devoteeId: string };

export interface EnqueueNotificationInput {
  tenantId: string;
  recipient: Recipient;
  notificationType: NotificationType;
  category: NotificationCategory;
  language: SupportedLanguage;
  templateVars: Record<string, string>;
}

function isPersonRecipient(recipient: Recipient): recipient is { personId: string } {
  return "personId" in recipient;
}

/**
 * The single chokepoint every automated trigger calls through — no module
 * sends WhatsApp messages directly. Inserts one `notifications` row per
 * channel the recipient is eligible for (gated by their preference, for
 * tenant members, or their WhatsApp opt-in, for devotees) and returns the
 * rows created. Actual delivery happens later via the cron sweep
 * (lib/notifications/delivery.ts) — this function only ever does fast DB
 * inserts, so callers never block on WhatsApp delivery.
 */
export async function enqueueNotification(input: EnqueueNotificationInput): Promise<Notification[]> {
  const channels = await eligibleChannels(input.tenantId, input.recipient, input.notificationType);
  const created: Notification[] = [];

  for (const channel of channels) {
    const template = await getTemplate(input.notificationType, channel, input.language);
    if (!template) continue; // no template configured for this type/channel — nothing to send

    const notification = await createNotification({
      tenantId: input.tenantId,
      recipientPersonId: isPersonRecipient(input.recipient) ? input.recipient.personId : undefined,
      recipientDevoteeId: isPersonRecipient(input.recipient) ? undefined : input.recipient.devoteeId,
      notificationType: input.notificationType,
      channel,
      category: input.category,
      title: template.title ? renderTemplate(template.title, input.templateVars) : null,
      message: renderTemplate(template.body, input.templateVars),
      language: template.language,
      metadata: input.templateVars,
    });
    created.push(notification);
  }

  return created;
}

/** Devotees have no in-app dashboard access — only WhatsApp is ever eligible for them. */
async function eligibleChannels(
  tenantId: string,
  recipient: Recipient,
  notificationType: NotificationType,
): Promise<NotificationChannel[]> {
  if (isPersonRecipient(recipient)) {
    const preference = await getPreference(recipient.personId, notificationType);
    const channels: NotificationChannel[] = [];
    if (preference?.inAppEnabled ?? true) channels.push("in_app");
    if (preference?.whatsappEnabled ?? true) channels.push("whatsapp");
    return channels;
  }

  const devotee = await getDevoteeById(tenantId, recipient.devoteeId);
  return devotee?.whatsappOptInStatus ? ["whatsapp"] : [];
}
