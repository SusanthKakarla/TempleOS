import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { deleteSocialLink, upsertSocialLink } from "@/lib/db/temple-social-links";
import { socialPlatformSchema, upsertSocialLinkSchema } from "@/lib/validation/temple-social-links";

interface RouteParams {
  params: Promise<{ platform: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { platform: rawPlatform } = await params;
  const platformResult = socialPlatformSchema.safeParse(rawPlatform);
  if (!platformResult.success) {
    return NextResponse.json({ error: "Unknown social platform" }, { status: 400 });
  }

  const json = await req.json().catch(() => null);
  const parsed = upsertSocialLinkSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const socialLink = await upsertSocialLink(session.tenantId, platformResult.data, parsed.data.url);
  return NextResponse.json({ socialLink });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { platform: rawPlatform } = await params;
  const platformResult = socialPlatformSchema.safeParse(rawPlatform);
  if (!platformResult.success) {
    return NextResponse.json({ error: "Unknown social platform" }, { status: 400 });
  }

  const deleted = await deleteSocialLink(session.tenantId, platformResult.data);
  if (!deleted) {
    return NextResponse.json({ error: "Social link not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
