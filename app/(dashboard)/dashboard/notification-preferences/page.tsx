import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { listPreferencesForPerson } from "@/lib/db/notification-preferences";
import { NotificationPreferencesForm } from "@/features/notifications/notification-preferences-form";
import { PageHeader } from "@/components/page-header";
import type { NotificationType } from "@/types/db";

const PREFERENCE_TYPES: NotificationType[] = [
  "birthday_priest",
  "user_welcome",
  "devotee_registered",
  "event_reminder",
];

export default async function NotificationPreferencesPage() {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("notificationPreferences.pageHeader");

  const saved = await listPreferencesForPerson(session.personId);
  const savedByType = new Map(saved.map((p) => [p.notificationType, p]));
  const preferences = PREFERENCE_TYPES.map((notificationType) => {
    const existing = savedByType.get(notificationType);
    return {
      notificationType,
      inAppEnabled: existing?.inAppEnabled ?? true,
      whatsappEnabled: existing?.whatsappEnabled ?? true,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <NotificationPreferencesForm preferences={preferences} />
    </div>
  );
}
