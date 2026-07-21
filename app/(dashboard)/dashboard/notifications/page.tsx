import { getLocale, getTranslations } from "next-intl/server";
import { BellRing, CheckCircle2, Clock, XCircle } from "lucide-react";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import {
  getEventNotificationSummary,
  listRecentEventNotifications,
  countEventNotificationsFiltered,
  type ListRecentEventNotificationsOptions,
} from "@/lib/db/event-notifications";
import { listRecentNotifications, countNotificationsFiltered } from "@/lib/db/notifications";
import { MetricCard } from "@/features/dashboard/metric-card";
import { NotificationList } from "@/features/notifications/notification-list";
import { AutomatedNotificationList } from "@/features/notifications/automated-notification-list";
import { parsePageParam } from "@/lib/pagination";
import { PageHeader } from "@/components/page-header";
import type { NotificationCategory, SupportedLanguage } from "@/types/db";

const NOTIFICATIONS_PAGE_SIZE = 50;

interface PageProps {
  searchParams: Promise<{
    eventId?: string;
    page?: string;
    sort?: string;
    dir?: string;
    category?: string;
    notifPage?: string;
  }>;
}

const SORT_VALUES: ListRecentEventNotificationsOptions["sort"][] = ["date", "status"];
const CATEGORY_VALUES: NotificationCategory[] = [
  "birthday",
  "anniversary",
  "new_user",
  "devotee",
  "family",
  "event",
  "announcement",
];

export default async function NotificationsPage({ searchParams }: PageProps) {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("notifications");
  const locale = (await getLocale()) as SupportedLanguage;

  const {
    eventId,
    page: pageParam,
    sort: sortParam,
    dir: dirParam,
    category: categoryParam,
    notifPage: notifPageParam,
  } = await searchParams;
  const page = parsePageParam(pageParam);
  const sort = SORT_VALUES.find((value) => value === sortParam);
  const dir = dirParam === "asc" ? "asc" : "desc";
  const category = CATEGORY_VALUES.find((value) => value === categoryParam);
  const notifPage = parsePageParam(notifPageParam);

  const [summary, notifications, totalCount, automatedNotifications, automatedTotalCount] = await Promise.all([
    getEventNotificationSummary(session.tenantId),
    listRecentEventNotifications(session.tenantId, {
      eventId,
      page,
      pageSize: NOTIFICATIONS_PAGE_SIZE,
      sort,
      dir,
    }),
    countEventNotificationsFiltered(session.tenantId, { eventId }),
    listRecentNotifications(session.tenantId, { category, page: notifPage, pageSize: NOTIFICATIONS_PAGE_SIZE }),
    countNotificationsFiltered(session.tenantId, { category }),
  ]);

  const successRate =
    summary.sent + summary.failed > 0
      ? Math.round((summary.sent / (summary.sent + summary.failed)) * 100)
      : 100;

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageHeader.title")} subtitle={t("pageHeader.subtitle")} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("metrics.totalSent")}
          value={summary.sent}
          icon={<CheckCircle2 className="size-4.5" />}
          gradient="gradient-green-emerald"
        />
        <MetricCard
          label={t("metrics.failed")}
          value={summary.failed}
          icon={<XCircle className="size-4.5" />}
          gradient="bg-destructive"
        />
        <MetricCard
          label={t("metrics.pending")}
          value={summary.pending}
          icon={<Clock className="size-4.5" />}
          gradient="gradient-saffron-gold"
        />
        <MetricCard
          label={t("metrics.successRate")}
          value={successRate}
          format="percent"
          icon={<BellRing className="size-4.5" />}
          gradient="gradient-blue-purple"
        />
      </div>

      <NotificationList
        notifications={notifications}
        eventId={eventId}
        page={page}
        pageSize={NOTIFICATIONS_PAGE_SIZE}
        totalCount={totalCount}
        sort={sort}
        dir={dir}
      />

      <AutomatedNotificationList
        notifications={automatedNotifications}
        category={category}
        page={notifPage}
        pageSize={NOTIFICATIONS_PAGE_SIZE}
        totalCount={automatedTotalCount}
        locale={locale}
      />
    </div>
  );
}
