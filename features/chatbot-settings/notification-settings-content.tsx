import { getTranslations } from "next-intl/server";
import { AlertTriangle, BellRing, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { EventNotificationListItem, ListRecentEventNotificationsOptions } from "@/lib/db/event-notifications";
import type { NotificationMedia } from "@/types/db";
import { MetricCard } from "@/features/dashboard/metric-card";
import { NotificationList } from "@/features/notifications/notification-list";
import { GreetingMediaCard } from "@/features/media/greeting-media-card";
import { FestivalMediaGrid } from "@/features/media/festival-media-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PATHNAME = "/dashboard/chatbot-settings";

interface NotificationSettingsContentProps {
  summary: { sent: number; failed: number; pending: number };
  notifications: EventNotificationListItem[];
  eventId?: string;
  page: number;
  pageSize: number;
  totalCount: number;
  sort?: ListRecentEventNotificationsOptions["sort"];
  dir: "asc" | "desc";
  birthdayMedia: NotificationMedia | null;
  anniversaryMedia: NotificationMedia | null;
  donationMedia: NotificationMedia | null;
  festivalMedia: NotificationMedia[];
  stuckRetrying: number;
}

/** Content for the Chatbot Settings "Notification Settings" tab — event-notification delivery metrics, media, and the event notification log. The "Automated Notifications" tab (birthday/anniversary/etc.) is a sibling tab, rendered separately. */
export async function NotificationSettingsContent({
  summary,
  notifications,
  eventId,
  page,
  pageSize,
  totalCount,
  sort,
  dir,
  birthdayMedia,
  anniversaryMedia,
  donationMedia,
  festivalMedia,
  stuckRetrying,
}: NotificationSettingsContentProps) {
  const t = await getTranslations("notifications");
  const successRate = summary.sent + summary.failed > 0 ? Math.round((summary.sent / (summary.sent + summary.failed)) * 100) : 100;

  return (
    <div className="space-y-6">
      {stuckRetrying > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{t("deliveryWarning.title")}</AlertTitle>
          <AlertDescription>{t("deliveryWarning.description", { count: stuckRetrying })}</AlertDescription>
        </Alert>
      )}

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

      <div className="grid gap-4 lg:grid-cols-2">
        <GreetingMediaCard birthday={birthdayMedia} anniversary={anniversaryMedia} donation={donationMedia} />
        <FestivalMediaGrid initialMedia={festivalMedia} />
      </div>

      <NotificationList
        notifications={notifications}
        eventId={eventId}
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        sort={sort}
        dir={dir}
        pathname={PATHNAME}
      />
    </div>
  );
}
