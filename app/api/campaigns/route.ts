import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createCampaign, listCampaigns, countCampaignsFiltered, type ListCampaignsFilter } from "@/lib/db/campaigns";
import { getTenantById } from "@/lib/db/tenants";
import { buildDonationLink } from "@/lib/campaigns/donation-message";
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
    audienceFilter: parsed.data.audienceFilter,
    bannerMediaId: parsed.data.bannerMediaId ?? null,
    linkedEventId: parsed.data.linkedEventId ?? null,
    scheduleType: parsed.data.scheduleType,
    scheduledAt: parsed.data.scheduledAt ?? null,
    recurrenceRule: parsed.data.recurrenceRule ?? null,
    goalAmount: parsed.data.goalAmount ?? null,
    campaignStartDate: parsed.data.campaignStartDate ?? null,
    campaignEndDate: parsed.data.campaignEndDate ?? null,
    createdBy: session.membershipId,
  });

  // The donation URL is available the instant the campaign exists (slug +
  // donationToken are generated unconditionally in createCampaign) — surfaced
  // here so the create dialog can show a "Copy Link" success confirmation
  // without a second round trip. Same buildDonationLink() every WhatsApp
  // broadcast and the Campaign Details page already use.
  const tenant = await getTenantById(session.tenantId);
  const donationLink = tenant ? buildDonationLink(tenant, campaign) : null;

  return NextResponse.json({ campaign, donationLink }, { status: 201 });
}
