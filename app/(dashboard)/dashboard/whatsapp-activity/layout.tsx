import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { getTenantById } from "@/lib/db/tenants";
import { getWhatsAppStats } from "@/lib/db/whatsapp-conversations";
import { WhatsAppStatsBar } from "@/features/whatsapp/whatsapp-stats-bar";
import { WhatsAppActivityPanes } from "@/features/whatsapp/whatsapp-activity-panes";
import { PageHeader } from "@/components/page-header";

export default async function WhatsAppActivityLayout({
  children,
  list,
}: {
  children: React.ReactNode;
  list: React.ReactNode;
}) {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("whatsappActivity.pageHeader");

  const tenant = await getTenantById(session.tenantId);
  const stats = tenant ? await getWhatsAppStats(session.tenantId, tenant.timezone) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      {stats && <WhatsAppStatsBar stats={stats} />}
      <WhatsAppActivityPanes list={list}>{children}</WhatsAppActivityPanes>
    </div>
  );
}
