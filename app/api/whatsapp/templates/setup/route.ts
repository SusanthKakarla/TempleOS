import { NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import {
  listPendingTemplatesForTenant,
  listTemplatesForTenant,
  setApprovalStatus,
} from "@/lib/db/whatsapp-message-templates";
import { createAuditLogEntry } from "@/lib/db/audit-log";
import { validatePlatformAccessToken } from "@/lib/whatsapp/embedded-signup";
import { syncTemplateApprovalStatus } from "@/lib/whatsapp/template-sync";
import { bootstrapStandardTemplates } from "@/lib/whatsapp/template-bootstrap";

/**
 * "Setup WhatsApp Templates" — one request doing everything the wizard
 * narrates as 4 steps: verify connection, verify the platform token can
 * reach Meta at all, bootstrap the standard catalog (idempotent — safe even
 * if the connect-time hook already ran it), then bulk-sync every pending
 * template's approval status. Unlike the single-row sync route, a single
 * template's Graph failure here must never abort the other ~25, so each
 * sync is individually caught.
 */
export async function POST() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const whatsappAccount = await getWhatsAppAccountByTenant(session.tenantId);
  if (!whatsappAccount || whatsappAccount.status !== "connected") {
    return NextResponse.json({ error: "No WhatsApp Business Account connected for this temple" }, { status: 400 });
  }

  const tokenCheck = await validatePlatformAccessToken();
  if (!tokenCheck.success) {
    return NextResponse.json(
      { error: `WhatsApp platform credentials are not working: ${tokenCheck.error}` },
      { status: 502 },
    );
  }

  const bootstrap = await bootstrapStandardTemplates(session.tenantId);

  const pending = await listPendingTemplatesForTenant(session.tenantId);
  let approved = 0;
  let stillPending = 0;
  let failed = 0;

  for (const template of pending) {
    try {
      const metaStatus = await syncTemplateApprovalStatus(
        whatsappAccount.metaBusinessAccountId,
        template.metaTemplateName,
        template.language,
      );
      if (!metaStatus) {
        stillPending += 1;
        continue;
      }
      await setApprovalStatus(session.tenantId, template.id, metaStatus);
      if (metaStatus === "approved") {
        approved += 1;
      } else {
        stillPending += 1;
      }
    } catch {
      failed += 1;
    }
  }

  await createAuditLogEntry({
    actorType: "tenant_member",
    actorId: session.membershipId,
    tenantId: session.tenantId,
    action: "whatsapp_templates.setup_completed",
    targetType: "whatsapp_account",
    targetId: whatsappAccount.id,
    metadata: {
      bootstrapCreated: bootstrap.created.length,
      bootstrapAlreadyExisted: bootstrap.alreadyExisted.length,
      checked: pending.length,
      approved,
      stillPending,
      failed,
    },
  });

  const templates = await listTemplatesForTenant(session.tenantId);
  return NextResponse.json({
    bootstrap,
    sync: { checked: pending.length, approved, stillPending, failed },
    templates,
  });
}
