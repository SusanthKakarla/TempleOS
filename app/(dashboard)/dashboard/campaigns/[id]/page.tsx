import { notFound } from "next/navigation";
import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { getCampaignById } from "@/lib/db/campaigns";
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

  return <CampaignDetail campaign={campaign} />;
}
