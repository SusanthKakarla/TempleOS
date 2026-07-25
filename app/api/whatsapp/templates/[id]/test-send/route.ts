import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getTemplateById } from "@/lib/db/whatsapp-message-templates";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { sendTemplate } from "@/lib/whatsapp/template-client";
import { testSendWhatsAppTemplateSchema } from "@/lib/validation/whatsapp-templates";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Sends the real template to a phone number the admin provides — goes through the exact same sendTemplate() path (load/validate/resolve/send) a real notification would, so a pending/unapproved template surfaces the same validation failure here as it would in production. */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = testSendWhatsAppTemplateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const template = await getTemplateById(session.tenantId, id);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const whatsappAccount = await getWhatsAppAccountByTenant(session.tenantId);
  if (!whatsappAccount) {
    return NextResponse.json({ error: "No WhatsApp Business Account connected for this temple" }, { status: 400 });
  }

  const result = await sendTemplate(
    whatsappAccount.metaPhoneNumberId,
    session.tenantId,
    template.templateKey,
    template.language,
    parsed.data.toPhone,
    parsed.data.sampleContext,
  );

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? "Test send failed", validationFailure: result.validationFailure },
      { status: 422 },
    );
  }
  return NextResponse.json({ ok: true, providerMessageId: result.providerMessageId });
}
