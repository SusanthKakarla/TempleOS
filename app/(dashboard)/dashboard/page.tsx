import { CalendarDays, HandCoins, Receipt, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "./require-dashboard-admin";
import { getTenantById } from "@/lib/db/tenants";
import { countEventsFiltered } from "@/lib/db/events";
import { countDevoteesFiltered } from "@/lib/db/devotees";
import { getDashboardDonationStats } from "@/lib/db/donations";
import { getUpcomingOccasions } from "@/lib/dashboard-upcoming-occasions";
import { MetricCard } from "@/features/dashboard/metric-card";
import { PageHeader } from "@/components/page-header";
import { UpcomingOccasionsWidget } from "@/features/dashboard/upcoming-occasions-widget";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { translateOne } from "@/lib/i18n/translate";

const UPCOMING_OCCASIONS_DAYS = 30;
const DEFAULT_TIMEZONE = "Asia/Kolkata";

function greetingKey(): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  const hour = new Date().getHours();
  if (hour < 12) return "greetingMorning";
  if (hour < 17) return "greetingAfternoon";
  return "greetingEvening";
}

export default async function DashboardHomePage() {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("dashboardHome");

  const tenant = await getTenantById(session.tenantId);

  const [totalEvents, totalDevotees, donationStats, upcomingOccasions, locale] = await Promise.all([
    countEventsFiltered(session.tenantId, {}),
    countDevoteesFiltered(session.tenantId, {}),
    getDashboardDonationStats(session.tenantId, {}),
    getUpcomingOccasions(session.tenantId, tenant?.timezone ?? DEFAULT_TIMEZONE, UPCOMING_OCCASIONS_DAYS),
    getLocaleCookie(),
  ]);
  const tenantName = tenant ? (locale === "te" ? await translateOne(tenant.name) : tenant.name) : null;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t("namaste")} ${tenantName ? `— ${tenantName}` : ""}`}
        subtitle={t("todayIs", { greeting: t(greetingKey()), date: today })}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label={t("metrics.totalDonations")}
          value={Number(donationStats.total)}
          format="currency"
          icon={<HandCoins className="size-4.5" />}
        />
        <MetricCard
          label={t("metrics.donationCount")}
          value={donationStats.count}
          icon={<Receipt className="size-4.5" />}
        />
        <MetricCard
          label={t("metrics.totalEvents")}
          value={totalEvents}
          icon={<CalendarDays className="size-4.5" />}
        />
        <MetricCard
          label={t("metrics.totalDevotees")}
          value={totalDevotees}
          icon={<Users className="size-4.5" />}
        />
      </div>

      <UpcomingOccasionsWidget occasions={upcomingOccasions} />
    </div>
  );
}
