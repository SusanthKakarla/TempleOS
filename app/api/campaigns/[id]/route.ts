import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getCampaignById, updateCampaign, deleteCampaign } from "@/lib/db/campaigns";
import { updateCampaignSchema } from "@/lib/validation/campaigns";
import type { NotificationType } from "@/types/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const campaign = await getCampaignById(session.tenantId, id);
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  return NextResponse.json({ campaign });
}

/** Draft-only edit surface — a campaign that has left draft can only move through status transitions (see /status route), not have its content rewritten mid-flight. */
export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const existing = await getCampaignById(session.tenantId, id);
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only draft campaigns can be edited" }, { status: 409 });
  }

  const json = await req.json().catch(() => null);
  const parsed = updateCampaignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const campaign = await updateCampaign(session.tenantId, id, {
    ...parsed.data,
    templateKey: (parsed.data.templateKey as NotificationType | null | undefined) ?? undefined,
  });
  return NextResponse.json({ campaign });
}

/** Restricted to `draft` — anything that ever ran is archived, never deleted, so delivery history stays intact. */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const existing = await getCampaignById(session.tenantId, id);
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  if (existing.status !== "draft") {
    return NextResponse.json({ error: "Only draft campaigns can be deleted — archive it instead" }, { status: 409 });
  }

  await deleteCampaign(session.tenantId, id);
  return NextResponse.json({ success: true });
}
