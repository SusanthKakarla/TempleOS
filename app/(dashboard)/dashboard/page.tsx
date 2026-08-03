import { CalendarDays, HandCoins, Receipt, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "./require-dashboard-admin";
import { getTenantById } from "@/lib/db/tenants";
import { countEventsFiltered } from "@/lib/db/events";
import { countDevoteesFiltered } from "@/lib/db/devotees";
import { getDashboardDonationStats, getDonationsPerDay } from "@/lib/db/donations";
import { MetricCard } from "@/features/dashboard/metric-card";
import { PageHeader } from "@/components/page-header";
import { zeroFillDays } from "@/lib/dashboard-timeseries";
import { DonationsChart } from "@/features/dashboard/donations-chart";
import { DashboardFilters } from "@/features/dashboard/dashboard-filters";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { translateOne } from "@/lib/i18n/translate";

const CHART_DAYS = 30;

function greetingKey(): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  const hour = new Date().getHours();
  if (hour < 12) return "greetingMorning";
  if (hour < 17) return "greetingAfternoon";
  return "greetingEvening";
}

interface DashboardHomePageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; purpose?: string }>;
}

export default async function DashboardHomePage({ searchParams }: DashboardHomePageProps) {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("dashboardHome");
  const { dateFrom, dateTo, purpose } = await searchParams;

  const [tenant, totalEvents, totalDevotees, donationStats, donationsPerDayRaw, locale] = await Promise.all([
    getTenantById(session.tenantId),
    countEventsFiltered(session.tenantId, { dateFrom, dateTo }),
    countDevoteesFiltered(session.tenantId, { dateFrom, dateTo }),
    getDashboardDonationStats(session.tenantId, { dateFrom, dateTo, purpose }),
    getDonationsPerDay(session.tenantId, CHART_DAYS),
    getLocaleCookie(),
  ]);
  const tenantName = tenant ? (locale === "te" ? await translateOne(tenant.name) : tenant.name) : null;

  const donationsPerDay = zeroFillDays(
    donationsPerDayRaw.map((row) => ({ date: row.date, total: Number(row.total) })),
    CHART_DAYS,
    { total: 0 },
  );

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

      <DashboardFilters />

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

      <DonationsChart data={donationsPerDay} />
    </div>
  );
}
