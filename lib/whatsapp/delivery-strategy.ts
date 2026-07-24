import { resolveConversationStatus, type ConversationStatus } from "./conversation-resolver";
import { getTemplateForNotification } from "./template-registry";
import type { WhatsAppMessageTemplate } from "@/types/db";

export type DeliveryStrategyResult =
  | { strategy: "FREE_FORM"; conversationStatus: ConversationStatus }
  | { strategy: "TEMPLATE"; conversationStatus: ConversationStatus; template: WhatsAppMessageTemplate }
  | { strategy: "UNDELIVERABLE"; conversationStatus: ConversationStatus; reason: string };

export interface ResolveDeliveryStrategyInput {
  tenantId: string;
  phone: string;
  templateKey: string;
  language: string;
}

/**
 * The single decision point: free-form vs. Meta Message Template vs.
 * undeliverable. Business logic never touches conversation-window or
 * template-lookup logic directly — it calls sendNotification(), which calls
 * this.
 *
 * "unknown" conversation status is treated the same as "inactive" — never
 * risk a free-form send Meta will reject just because the window-check
 * itself couldn't run.
 */
export async function resolveDeliveryStrategy(input: ResolveDeliveryStrategyInput): Promise<DeliveryStrategyResult> {
  const conversationStatus = await resolveConversationStatus(input.tenantId, input.phone);

  if (conversationStatus === "active") {
    return { strategy: "FREE_FORM", conversationStatus };
  }

  const template = await getTemplateForNotification(input.tenantId, input.templateKey, input.language);
  if (!template) {
    return {
      strategy: "UNDELIVERABLE",
      conversationStatus,
      reason: `Conversation window is closed and no approved WhatsApp template is configured for "${input.templateKey}" (${input.language}).`,
    };
  }
  return { strategy: "TEMPLATE", conversationStatus, template };
}
