import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createCampaign, listCampaigns, countCampaignsFiltered, type ListCampaignsFilter } from "@/lib/db/campaigns";
import { replaceCampaignGallery } from "@/lib/db/campaign-media";
import { createCampaignSchema } from "@/lib/validation/campaigns";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { CampaignStatus, NotificationType } from "@/types/db";

const SORT_VALUES: ListCampaignsFilter["sort"][] = ["created", "title", "status"];
const STATUS_VALUES: CampaignStatus[] = ["draft", "scheduled", "running", "paused", "completed", "archived", "cancelled"];

export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const params = req.nextUrl.searchParams;
  const page = parsePageParam(params.get("page") ?? undefined);
  const status = STATUS_VALUES.find((value) => value === params.get("status"));
  const sort = SORT_VALUES.find((value) => value === params.get("sort"));
  const dir = params.get("dir") === "asc" ? "asc" : "desc";
  const search = params.get("search") ?? undefined;

  const filter: ListCampaignsFilter = { status, search, page, pageSize: DEFAULT_PAGE_SIZE, sort, dir };
  const [campaigns, totalCount] = await Promise.all([
    listCampaigns(session.tenantId, filter),
    countCampaignsFiltered(session.tenantId, { status, search }),
  ]);
  return NextResponse.json({ campaigns, totalCount });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = createCampaignSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const campaign = await createCampaign(session.tenantId, {
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    campaignType: parsed.data.campaignType,
    channel: parsed.data.channel,
    // Validated by zod only as a non-empty string, not against the full
    // NotificationType union — campaign template keys may reference
    // future/custom types not yet added to that union.
    templateKey: (parsed.data.templateKey as NotificationType | undefined) ?? null,
    customMessage: parsed.data.customMessage ?? null,
    audienceFilter: parsed.data.audienceFilter,
    bannerMediaId: parsed.data.bannerMediaId ?? null,
    linkedEventId: parsed.data.linkedEventId ?? null,
    linkedDonationPurpose: parsed.data.linkedDonationPurpose ?? null,
    scheduleType: parsed.data.scheduleType,
    scheduledAt: parsed.data.scheduledAt ?? null,
    recurrenceRule: parsed.data.recurrenceRule ?? null,
    goalAmount: parsed.data.goalAmount ?? null,
    campaignStartDate: parsed.data.campaignStartDate ?? null,
    campaignEndDate: parsed.data.campaignEndDate ?? null,
    createdBy: session.membershipId,
  });

  if (parsed.data.galleryMediaIds) {
    await replaceCampaignGallery(session.tenantId, campaign.id, parsed.data.galleryMediaIds);
  }

  return NextResponse.json({ campaign }, { status: 201 });
}
