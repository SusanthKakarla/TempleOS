import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { createTemplate, listTemplatesForTenant } from "@/lib/db/whatsapp-message-templates";
import { isUniqueViolation } from "@/lib/db/unique-violation";
import { createWhatsAppTemplateSchema } from "@/lib/validation/whatsapp-templates";

export async function GET() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const templates = await listTemplatesForTenant(session.tenantId);
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = createWhatsAppTemplateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const template = await createTemplate(session.tenantId, {
      templateKey: parsed.data.templateKey,
      metaTemplateName: parsed.data.metaTemplateName,
      language: parsed.data.language,
      metaCategory: parsed.data.metaCategory,
      variables: parsed.data.variables,
      fallbackStrategy: parsed.data.fallbackStrategy ?? null,
      description: parsed.data.description ?? null,
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "A template for this key and language already exists — edit it instead of creating a duplicate." },
        { status: 409 },
      );
    }
    throw err;
  }
}
