import { notFound } from "next/navigation";
import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { getCampaignById } from "@/lib/db/campaigns";
import { getTenantById } from "@/lib/db/tenants";
import { buildDonationLink } from "@/lib/campaigns/donation-message";
import { CAMPAIGN_PREVIEW_PARAM, createCampaignPreviewToken } from "@/lib/campaigns/campaign-preview-token";
import { listCampaignGallery } from "@/lib/db/campaign-media";
import { CampaignDetail } from "@/features/campaigns/campaign-detail";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { translateFields } from "@/lib/i18n/translate-rows";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "campaigns");

  const { id } = await params;
  const campaignRaw = await getCampaignById(session.tenantId, id);
  if (!campaignRaw) notFound();

  const locale = await getLocaleCookie();
  const [campaign] = await translateFields([campaignRaw], locale, ["title", "description"]);

  // Same buildDonationLink() every WhatsApp broadcast already uses — never a
  // second URL scheme. Only shown once the campaign is actually linked to a
  // donation purpose (matches the existing Donations tab / Preview button
  // gating elsewhere on this page).
  const tenant = campaign.linkedDonationPurpose ? await getTenantById(session.tenantId) : null;
  const donationLink = tenant ? buildDonationLink(tenant, campaign) : null;

  // Same URL plus a short-lived signed preview grant, so "Open Campaign"
  // works for this admin even before the campaign is public (draft, not yet
  // started, payments not connected) and across the public donation host,
  // where their dashboard cookie isn't sent. Only the plain donationLink is
  // ever copied/shared — see CampaignActions.
  const previewLink =
    tenant && donationLink
      ? `${donationLink}?${CAMPAIGN_PREVIEW_PARAM}=${encodeURIComponent(createCampaignPreviewToken(tenant.slug, campaign.slug))}`
      : null;

  const gallery = await listCampaignGallery(session.tenantId, campaign.id);

  return (
    <CampaignDetail campaign={campaign} donationLink={donationLink} previewLink={previewLink} gallery={gallery} />
  );
}
