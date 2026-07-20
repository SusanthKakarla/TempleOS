import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { getTenantById } from "@/lib/db/tenants";
import { getWhatsAppStats } from "@/lib/db/whatsapp-conversations";
import { WhatsAppStatsBar } from "@/features/whatsapp/whatsapp-stats-bar";
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
      <div className="flex h-[75vh] min-h-125 gap-4 overflow-hidden">
        <div className="glass-panel w-full max-w-xs shrink-0 overflow-hidden rounded-2xl lg:max-w-sm xl:max-w-md">
          {list}
        </div>
        <div className="glass-panel flex-1 overflow-hidden rounded-2xl">{children}</div>
      </div>
    </div>
  );
}
