import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { deleteTemplate, updateTemplate } from "@/lib/db/whatsapp-message-templates";
import { updateWhatsAppTemplateSchema } from "@/lib/validation/whatsapp-templates";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateWhatsAppTemplateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const template = await updateTemplate(session.tenantId, id, parsed.data);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ template });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const deleted = await deleteTemplate(session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
