import { requireDashboardAdmin } from "../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { listCampaigns, countCampaignsFiltered, type ListCampaignsFilter } from "@/lib/db/campaigns";
import { getTenantById } from "@/lib/db/tenants";
import { buildDonationLink } from "@/lib/campaigns/donation-message";
import { CampaignsTable } from "@/features/campaigns/campaigns-table";
import { parsePageParam, DEFAULT_PAGE_SIZE } from "@/lib/pagination";
import type { CampaignStatus, CampaignType } from "@/types/db";
import { CAMPAIGN_TYPES } from "@/types/db";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { translateFields } from "@/lib/i18n/translate-rows";
import { toEnglishSearchQuery } from "@/lib/i18n/search-query";

interface CampaignsPageProps {
  searchParams: Promise<{ search?: string; status?: string; campaignType?: string; page?: string }>;
}

const STATUS_VALUES: CampaignStatus[] = ["draft", "scheduled", "running", "paused", "completed", "archived", "cancelled"];

export default async function CampaignsPage({ searchParams }: CampaignsPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "campaigns");

  const { search, status: statusParam, campaignType: typeParam, page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);
  const status = STATUS_VALUES.find((value) => value === statusParam);
  const campaignType = CAMPAIGN_TYPES.find((value: CampaignType) => value === typeParam);

  const locale = await getLocaleCookie();
  const translatedSearch = search ? await toEnglishSearchQuery(search) : search;

  const filter: ListCampaignsFilter = { search: translatedSearch, status, campaignType, page, pageSize: DEFAULT_PAGE_SIZE };
  const [campaignsRaw, totalCount] = await Promise.all([
    listCampaigns(session.tenantId, filter),
    countCampaignsFiltered(session.tenantId, { search: translatedSearch, status, campaignType }),
  ]);
  const campaigns = await translateFields(campaignsRaw, locale, ["title", "description"]);

  // Same buildDonationLink() every WhatsApp broadcast already uses — never a
  // second URL scheme. One tenant lookup, reused for every linked campaign
  // on the page.
  const tenant = campaigns.some((c) => c.linkedDonationPurpose) ? await getTenantById(session.tenantId) : null;
  const donationLinks: Record<string, string> = {};
  if (tenant) {
    for (const campaign of campaigns) {
      if (campaign.linkedDonationPurpose) donationLinks[campaign.id] = buildDonationLink(tenant, campaign);
    }
  }

  return (
    <CampaignsTable
      campaigns={campaigns}
      page={page}
      pageSize={DEFAULT_PAGE_SIZE}
      totalCount={totalCount}
      donationLinks={donationLinks}
    />
  );
}
