import { sendImageMessage, sendTextMessage, type SendMessageResult } from "./client";
import { resolveDeliveryStrategy } from "./delivery-strategy";
import { sendTemplate } from "./template-client";
import { classifyWhatsAppError, isPermanentWhatsAppError } from "./errors";
import type { ConversationStatus } from "./conversation-resolver";

export interface SendNotificationInput {
  tenantId: string;
  phoneNumberId: string;
  toPhone: string;
  /** Matches an existing NotificationType where one exists (e.g. "user_welcome") — the registry lookup key. */
  templateKey: string;
  language: string;
  /** Free-form send content — used when the strategy resolves to FREE_FORM (byte-identical to the pre-existing behavior). */
  freeFormMessage: string;
  freeFormImageUrl?: string | null;
  /** Named variable context for template sends — the notification's own `metadata` (already populated by enqueueNotification for the free-form render). */
  templateContext: Record<string, string | undefined>;
}

export interface SendNotificationResult extends SendMessageResult {
  strategyUsed: "free_form" | "template";
  templateUsed: string | null;
  conversationStatus: ConversationStatus;
  /** True when this failure should never be retried — a permanent Meta error, or a local validation failure that will fail identically on every future attempt. */
  permanent: boolean;
  errorCategory?: string;
}

/**
 * The single entry point the Notification Engine calls instead of choosing
 * sendTextMessage/sendImageMessage/sendTemplateMessage directly — resolves
 * free-form vs. template automatically and returns one uniform result shape
 * the delivery pipeline persists/retries from.
 */
export async function sendNotification(input: SendNotificationInput): Promise<SendNotificationResult> {
  const strategy = await resolveDeliveryStrategy({
    tenantId: input.tenantId,
    phone: input.toPhone,
    templateKey: input.templateKey,
    language: input.language,
  });

  if (strategy.strategy === "FREE_FORM") {
    const result = input.freeFormImageUrl
      ? await sendImageMessage(input.phoneNumberId, input.toPhone, input.freeFormImageUrl, input.freeFormMessage)
      : await sendTextMessage(input.phoneNumberId, input.toPhone, input.freeFormMessage);
    return {
      ...result,
      strategyUsed: "free_form",
      templateUsed: null,
      conversationStatus: strategy.conversationStatus,
      permanent: !result.success && isPermanentWhatsAppError(result.errorCode),
      errorCategory: !result.success ? classifyWhatsAppError(result.errorCode) : undefined,
    };
  }

  if (strategy.strategy === "UNDELIVERABLE") {
    return {
      success: false,
      providerMessageId: null,
      error: strategy.reason,
      strategyUsed: "template",
      templateUsed: null,
      conversationStatus: strategy.conversationStatus,
      permanent: true,
      errorCategory: "template_missing",
    };
  }

  const result = await sendTemplate(
    input.phoneNumberId,
    input.tenantId,
    input.templateKey,
    input.language,
    input.toPhone,
    input.templateContext,
  );
  // A local validation failure (missing/unapproved/disabled template, missing
  // variables) will fail identically on every retry, same as a permanent Meta
  // error — both go straight to the terminal state, never the backoff loop.
  const permanent = !result.success && (result.validationFailure !== undefined || isPermanentWhatsAppError(result.errorCode));
  return {
    ...result,
    strategyUsed: "template",
    templateUsed: result.template?.metaTemplateName ?? null,
    conversationStatus: strategy.conversationStatus,
    permanent,
    errorCategory: result.validationFailure ?? (!result.success ? classifyWhatsAppError(result.errorCode) : undefined),
  };
}
