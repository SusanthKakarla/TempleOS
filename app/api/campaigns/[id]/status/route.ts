import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getCampaignById, updateCampaignStatus } from "@/lib/db/campaigns";
import { canTransitionCampaignStatus } from "@/lib/campaigns/lifecycle";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const actionSchema = z.object({ action: z.enum(["pause", "resume", "cancel", "archive"]) });

/** Pure status flips only — no enqueue, no delivery — those live in /schedule and /send. */
const NEXT_STATUS = {
  pause: "paused",
  resume: "running",
  cancel: "cancelled",
  archive: "archived",
} as const;

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const existing = await getCampaignById(session.tenantId, id);
  if (!existing) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  const json = await req.json().catch(() => null);
  const parsed = actionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const target = NEXT_STATUS[parsed.data.action];
  // "resume" from paused always goes back to "running" as far as the state
  // machine is concerned, but a paused campaign that hadn't started sending
  // yet (paused straight from scheduled) should resume into "scheduled" —
  // resume just un-pauses whichever state it was in before.
  const resolvedTarget =
    parsed.data.action === "resume" && existing.nextRunAt && !existing.lastRunAt ? "scheduled" : target;

  if (!canTransitionCampaignStatus(existing.status, resolvedTarget)) {
    return NextResponse.json(
      { error: `Cannot move a campaign from "${existing.status}" to "${resolvedTarget}"` },
      { status: 409 },
    );
  }

  const campaign = await updateCampaignStatus(session.tenantId, id, resolvedTarget);
  return NextResponse.json({ campaign });
}
