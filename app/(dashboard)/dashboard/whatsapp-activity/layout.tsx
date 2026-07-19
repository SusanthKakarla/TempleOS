import { requireDashboardAdmin } from "../require-dashboard-admin";
import { getTenantById } from "@/lib/db/tenants";
import { getWhatsAppStats } from "@/lib/db/whatsapp-conversations";
import { WhatsAppStatsBar } from "@/features/whatsapp/whatsapp-stats-bar";

export default async function WhatsAppActivityLayout({
  children,
  list,
}: {
  children: React.ReactNode;
  list: React.ReactNode;
}) {
  const session = await requireDashboardAdmin();

  const tenant = await getTenantById(session.tenantId);
  const stats = tenant ? await getWhatsAppStats(session.tenantId, tenant.timezone) : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-2xl font-semibold">Conversations</h1>
        <p className="text-sm text-muted-foreground">
          Every devotee&apos;s WhatsApp messages in one thread, with unread tracking and search.
        </p>
      </div>
      {stats && <WhatsAppStatsBar stats={stats} />}
      <div className="flex h-[75vh] min-h-125 gap-4 overflow-hidden">
        <div className="w-full max-w-xs shrink-0 overflow-hidden rounded-xl border bg-background">{list}</div>
        <div className="flex-1 overflow-hidden rounded-xl border bg-background">{children}</div>
      </div>
    </div>
  );
}
