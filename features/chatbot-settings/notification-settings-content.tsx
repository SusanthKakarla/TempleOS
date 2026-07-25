import { getTranslations } from "next-intl/server";
import { AlertTriangle } from "lucide-react";
import type { NotificationMedia } from "@/types/db";
import { GreetingMediaCard } from "@/features/media/greeting-media-card";
import { FestivalMediaGrid } from "@/features/media/festival-media-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface NotificationSettingsContentProps {
  birthdayMedia: NotificationMedia | null;
  anniversaryMedia: NotificationMedia | null;
  donationMedia: NotificationMedia | null;
  festivalMedia: NotificationMedia[];
  stuckRetrying: number;
}

/** Content for the Chatbot Settings "Notification Settings" tab — delivery health alert and greeting/festival media configuration. The "Automated Notifications" tab (the unified notification log) is a sibling tab, rendered separately. */
export async function NotificationSettingsContent({
  birthdayMedia,
  anniversaryMedia,
  donationMedia,
  festivalMedia,
  stuckRetrying,
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
    </div>
  );
}
