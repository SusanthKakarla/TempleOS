import { GRAPH_API_VERSION } from "./graph-api";
import type { WhatsAppTemplateApprovalStatus } from "@/types/db";

interface MetaTemplateStatusResponse {
  data?: { name: string; status: string; language: string }[];
  error?: { message?: string; code?: number };
}

function mapMetaStatus(metaStatus: string): WhatsAppTemplateApprovalStatus {
  switch (metaStatus.toUpperCase()) {
    case "APPROVED":
      return "approved";
    case "REJECTED":
      return "rejected";
    case "PAUSED":
    case "DISABLED":
      return "disabled";
    default:
      return "pending"; // PENDING, IN_APPEAL, PENDING_DELETION, etc.
  }
}

/**
 * Read-only pull of a template's current approval status from Meta's
 * Template List API — does not create/submit anything (submitting a
 * template for approval stays a manual, per-tenant step in Meta Business
 * Manager). Returns null if Meta has no record of this template
 * name/language at all for this WABA (not yet submitted, or a typo).
 */
export async function syncTemplateApprovalStatus(
  wabaId: string,
  templateName: string,
  language: string,
): Promise<WhatsAppTemplateApprovalStatus | null> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("WhatsApp credentials are not configured");
  }

  const url = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates`);
  url.searchParams.set("name", templateName);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await response.json().catch(() => ({}))) as MetaTemplateStatusResponse;
  if (!response.ok) {
    throw new Error(json.error?.message ?? `HTTP ${response.status}`);
  }

  const match = json.data?.find((t) => t.language === language);
  return match ? mapMetaStatus(match.status) : null;
}
