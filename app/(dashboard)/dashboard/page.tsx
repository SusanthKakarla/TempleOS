import { CalendarDays, HandCoins, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "./require-dashboard-admin";
import { getTenantById } from "@/lib/db/tenants";
import { countUpcomingPublishedEvents } from "@/lib/db/events";
import { countDevotees } from "@/lib/db/devotees";
import { getDonationSummary, getDonationsPerDay } from "@/lib/db/donations";
import { MetricCard } from "@/features/dashboard/metric-card";
import { PageHeader } from "@/components/page-header";
import { zeroFillDays } from "@/lib/dashboard-timeseries";
import { DonationsChart } from "@/features/dashboard/donations-chart";

const CHART_DAYS = 30;

function greetingKey(): "greetingMorning" | "greetingAfternoon" | "greetingEvening" {
  const hour = new Date().getHours();
  if (hour < 12) return "greetingMorning";
  if (hour < 17) return "greetingAfternoon";
  return "greetingEvening";
}

export default async function DashboardHomePage() {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("dashboardHome");

  const [tenant, upcomingEvents, totalDevotees, donationSummary, donationsPerDayRaw] = await Promise.all([
    getTenantById(session.tenantId),
    countUpcomingPublishedEvents(session.tenantId),
    countDevotees(session.tenantId),
    getDonationSummary(session.tenantId),
    getDonationsPerDay(session.tenantId, CHART_DAYS),
  ]);

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
        title={`${t("namaste")} ${tenant ? `— ${tenant.name}` : ""}`}
        subtitle={t("todayIs", { greeting: t(greetingKey()), date: today })}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label={t("metrics.totalDonations")}
          value={Number(donationSummary.totalThisMonth)}
          format="currency"
          icon={<HandCoins className="size-4.5" />}
          gradient="gradient-saffron-gold"
        />
        <MetricCard
          label={t("metrics.upcomingEvents")}
          value={upcomingEvents}
          icon={<CalendarDays className="size-4.5" />}
          gradient="gradient-maroon-orange"
        />
        <MetricCard
          label={t("metrics.totalDevotees")}
          value={totalDevotees}
          icon={<Users className="size-4.5" />}
          gradient="gradient-blue-purple"
        />
      </div>

      <DonationsChart data={donationsPerDay} />
    </div>
  );
}
