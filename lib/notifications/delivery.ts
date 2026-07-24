import { getDevoteeById } from "@/lib/db/devotees";
import { getPersonById } from "@/lib/db/persons";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { createAuditLogEntry } from "@/lib/db/audit-log";
import {
  claimNotification,
  computeRetryState,
  getNotificationByProviderMessageId,
  markNotificationDelivered,
  markNotificationFailed,
  markNotificationPermanentlyFailed,
  markNotificationReadReceipt,
  markNotificationSent,
} from "@/lib/db/notifications";
import { buildWhatsAppImageUrl } from "@/lib/media/imagekit";
import { sendImageMessage, sendTextMessage } from "@/lib/whatsapp/client";
import { isPermanentWhatsAppError } from "@/lib/whatsapp/errors";
import type { Notification } from "@/types/db";

/**
 * Sends/marks every given `notifications` row. Called both from an after()
 * hook right after enqueueing (fast path) and the cron sweep (durable
 * catch-all + retries) — the caller decides which ids to process.
 */
export async function processNotifications(ids: string[]): Promise<void> {
  for (const id of ids) {
    await processOneNotification(id);
  }
}

async function processOneNotification(id: string): Promise<void> {
  const claimed = await claimNotification(id);
  if (!claimed) return; // already handled elsewhere, or not actually due

  if (claimed.channel === "in_app") {
    // No external delivery step — the Notification Center reads the row directly.
    await markNotificationSent(claimed.id, null);
    await logOutcome(claimed, "sent");
    return;
  }

  const phone = await resolveRecipientPhone(claimed);
  const whatsappAccount = await getWhatsAppAccountByTenant(claimed.tenantId);
  if (!phone || !whatsappAccount) {
    await failWithLog(claimed, "Recipient phone or WhatsApp account not found");
    return;
  }

  const media = claimed.mediaId ? await getNotificationMediaById(claimed.tenantId, claimed.mediaId) : null;
  const result = media
    ? await sendImageMessage(
        whatsappAccount.metaPhoneNumberId,
        phone,
        buildWhatsAppImageUrl(media.imageUrl),
        claimed.message,
      )
    : await sendTextMessage(whatsappAccount.metaPhoneNumberId, phone, claimed.message);
  if (result.success) {
    await markNotificationSent(claimed.id, result.providerMessageId);
    await logOutcome(claimed, "sent");
  } else if (isPermanentWhatsAppError(result.errorCode)) {
    const reason = result.error ?? "Permanent WhatsApp delivery failure";
    await markNotificationPermanentlyFailed(claimed.id, reason);
    await logOutcome(claimed, "failed", reason);
  } else {
    await failWithLog(claimed, result.error ?? "Unknown send error");
  }
}

/**
 * Applies a Meta delivery-status webhook callback (the async statuses array,
 * distinct from Meta's synchronous send-accepted response) to whichever
 * notification row it belongs to. A "sent" status is a no-op — this table
 * already marked it sent synchronously. "failed" reuses markNotificationFailed
 * as-is, so an async-detected failure gets the same retry backoff as a
 * synchronous one — no separate retry mechanism.
 */
export async function applyWebhookDeliveryStatus(
  providerMessageId: string,
  status: "sent" | "delivered" | "read" | "failed",
  errorReason?: string,
  errorCode?: number,
): Promise<void> {
  const notification = await getNotificationByProviderMessageId(providerMessageId);
  if (!notification) return; // not a generic-engine send (legacy pipeline or inbound reply) — out of scope

  if (status === "delivered") {
    await markNotificationDelivered(notification.id);
  } else if (status === "read") {
    await markNotificationReadReceipt(notification.id);
  } else if (status === "failed") {
    const reason = errorReason ?? "WhatsApp reported delivery failure";
    if (isPermanentWhatsAppError(errorCode)) {
      await markNotificationPermanentlyFailed(notification.id, reason);
      await logOutcome(notification, "failed", reason);
    } else {
      await failWithLog(notification, reason);
    }
  }
}

async function resolveRecipientPhone(notification: Notification): Promise<string | null> {
  if (notification.recipientDevoteeId) {
    const devotee = await getDevoteeById(notification.tenantId, notification.recipientDevoteeId);
    return devotee?.whatsappPhone ?? null;
  }
  if (notification.recipientPersonId) {
    const person = await getPersonById(notification.recipientPersonId);
    return person?.phoneNumber ?? null;
  }
  return null;
}

/** Only logs to audit_log on a TERMINAL failure (not each intermediate retry) — mirrors the "sent" path 1:1. */
async function failWithLog(notification: Notification, reason: string): Promise<void> {
  await markNotificationFailed(notification.id, notification.attemptCount, reason);
  const { deliveryStatus } = computeRetryState(notification.attemptCount + 1);
  if (deliveryStatus === "failed") {
    await logOutcome(notification, "failed", reason);
  }
}

async function logOutcome(notification: Notification, outcome: "sent" | "failed", reason?: string): Promise<void> {
  await createAuditLogEntry({
    actorType: "system",
    actorId: notification.tenantId,
    tenantId: notification.tenantId,
    action: outcome === "sent" ? "notification.sent" : "notification.failed",
    targetType: "notification",
    targetId: notification.id,
    metadata: {
      notificationType: notification.notificationType,
      channel: notification.channel,
      category: notification.category,
      hasMedia: notification.mediaId !== null,
      ...(reason ? { failureReason: reason } : {}),
    },
  });
}
