import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, CreditCard } from "lucide-react";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { isFeatureEnabled } from "@/lib/db/tenant-features";
import { PageHeader } from "@/components/page-header";
import { PWAStatus } from "@/components/pwa/pwa-status";

export default async function SettingsPage() {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("settings");
  const paymentsEnabled = await isFeatureEnabled(session.tenantId, "donations");

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageHeader.title")} subtitle={t("pageHeader.subtitle")} />

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">{t("applicationSection")}</h2>
        <PWAStatus />
      </section>

      {paymentsEnabled && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("paymentsSection")}</h2>
          <Link
            href="/dashboard/settings/payments"
            className="glass-card flex items-center gap-3 rounded-2xl p-4 shadow-sm transition-colors hover:bg-accent"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CreditCard className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{t("paymentsLinkTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("paymentsLinkDescription")}</p>
            </div>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
          </Link>
        </section>
      )}
    </div>
  );
}
