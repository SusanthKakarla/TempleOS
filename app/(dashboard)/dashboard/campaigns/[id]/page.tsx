import { notFound } from "next/navigation";
import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { getCampaignById } from "@/lib/db/campaigns";
import { CampaignDetail } from "@/features/campaigns/campaign-detail";

interface CampaignDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: CampaignDetailPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "campaigns");

  const { id } = await params;
  const campaign = await getCampaignById(session.tenantId, id);
  if (!campaign) notFound();

  return <CampaignDetail campaign={campaign} />;
}
