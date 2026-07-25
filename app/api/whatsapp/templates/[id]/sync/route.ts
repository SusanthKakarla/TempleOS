import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getTemplateById, setApprovalStatus } from "@/lib/db/whatsapp-message-templates";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { syncTemplateApprovalStatus } from "@/lib/whatsapp/template-sync";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Pulls the template's current approval status from Meta's (read-only) Template List API and persists it — the "Last Sync" action. */
export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const template = await getTemplateById(session.tenantId, id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const whatsappAccount = await getWhatsAppAccountByTenant(session.tenantId);
  if (!whatsappAccount) {
    return NextResponse.json({ error: "No WhatsApp Business Account connected for this temple" }, { status: 400 });
  }

  try {
    const metaStatus = await syncTemplateApprovalStatus(
      whatsappAccount.metaBusinessAccountId,
      template.metaTemplateName,
      template.language,
    );
    if (!metaStatus) {
      return NextResponse.json(
        {
          error: `Meta has no record of a template named "${template.metaTemplateName}" (${template.language}) for this WhatsApp Business Account yet.`,
        },
        { status: 404 },
      );
    }
    const updated = await setApprovalStatus(session.tenantId, id, metaStatus);
    return NextResponse.json({ template: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to sync template status from Meta" },
      { status: 502 },
    );
  }
}
