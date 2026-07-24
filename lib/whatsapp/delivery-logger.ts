import {
  computeRetryState,
  markNotificationFailed,
  markNotificationPermanentlyFailed,
  markNotificationSent,
  type DeliveryMetadata,
} from "@/lib/db/notifications";
import type { Notification } from "@/types/db";
import type { SendNotificationResult } from "./send-notification";

export interface DeliveryLogOutcome {
  outcome: "sent" | "failed" | "retrying";
  /** True once the row has reached a terminal state (sent, or permanently/finally failed) — mirrors the existing failWithLog audit-log-only-on-terminal-failure behavior. */
  terminal: boolean;
}

/**
 * The one place that persists a sendNotification() result onto the
 * notification row — delivery_strategy/template_used/conversation_status
 * alongside the outcome, plus the structured Meta error code/category on
 * failure. Every notification is fully traceable from this row (and the
 * existing failure_reason free-text) without a separate log store.
 *
 * Never persists anything beyond what's already in SendNotificationResult —
 * no access token, WABA ID, phone number ID, or webhook secret ever flows
 * through this function, so there's nothing to mask; it isn't in scope.
 */
export async function logDeliveryOutcome(
  notification: Notification,
  result: SendNotificationResult,
): Promise<DeliveryLogOutcome> {
  const delivery: DeliveryMetadata = {
    deliveryStrategy: result.strategyUsed,
    templateUsed: result.templateUsed,
    conversationStatus: result.conversationStatus,
  };

  if (result.success) {
    await markNotificationSent(notification.id, result.providerMessageId, delivery);
    return { outcome: "sent", terminal: true };
  }

  const failureDelivery: DeliveryMetadata = {
    ...delivery,
    metaErrorCode: result.errorCode ?? null,
    metaErrorCategory: result.errorCategory ?? null,
  };

  if (result.permanent) {
    await markNotificationPermanentlyFailed(notification.id, result.error ?? "Delivery failed", failureDelivery);
    return { outcome: "failed", terminal: true };
  }

  await markNotificationFailed(notification.id, notification.attemptCount, result.error ?? "Unknown send error", failureDelivery);
  const { deliveryStatus } = computeRetryState(notification.attemptCount + 1);
  return { outcome: deliveryStatus === "failed" ? "failed" : "retrying", terminal: deliveryStatus === "failed" };
}
