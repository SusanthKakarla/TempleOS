import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import type { NotificationListItem } from "@/lib/db/notifications";
import type { NotificationCategory, NotificationMedia, SupportedLanguage } from "@/types/db";
import { AutomatedNotificationList } from "@/features/notifications/automated-notification-list";
import { GreetingMediaCard } from "@/features/media/greeting-media-card";
import { FestivalMediaGrid } from "@/features/media/festival-media-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const PATHNAME = "/dashboard/chatbot-settings";

interface NotificationSettingsContentProps {
  automatedNotifications: NotificationListItem[];
  category?: NotificationCategory;
  notifPage: number;
  pageSize: number;
  automatedTotalCount: number;
  birthdayMedia: NotificationMedia | null;
  anniversaryMedia: NotificationMedia | null;
  donationMedia: NotificationMedia | null;
  festivalMedia: NotificationMedia[];
  stuckRetrying: number;
  locale: SupportedLanguage;
}

export async function NotificationSettingsContent({
  automatedNotifications,
  category,
  notifPage,
  pageSize,
  automatedTotalCount,
  birthdayMedia,
  anniversaryMedia,
  donationMedia,
  festivalMedia,
  stuckRetrying,
  locale,
}: NotificationSettingsContentProps) {
  const t = await getTranslations("notifications");

  return (
    <div className="space-y-6">
      {stuckRetrying > 0 && (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>{t("deliveryWarning.title")}</AlertTitle>
          <AlertDescription>{t("deliveryWarning.description", { count: stuckRetrying })}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <GreetingMediaCard birthday={birthdayMedia} anniversary={anniversaryMedia} donation={donationMedia} />
        <FestivalMediaGrid initialMedia={festivalMedia} />
      </div>

      <AutomatedNotificationList
        notifications={automatedNotifications}
        category={category}
        page={notifPage}
        pageSize={pageSize}
        totalCount={automatedTotalCount}
        locale={locale}
        pathname={PATHNAME}
      />
    </div>
  );
}
