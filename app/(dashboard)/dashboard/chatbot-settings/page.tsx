import { getLocale, getTranslations } from "next-intl/server";
import { MessageCircle, Settings2, BellRing } from "lucide-react";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { isFeatureEnabled } from "@/lib/db/tenant-features";
import { getTenantById } from "@/lib/db/tenants";
import { listSpecialDays } from "@/lib/db/temple-special-days";
import { listSevas } from "@/lib/db/temple-sevas";
import { listFaqs } from "@/lib/db/temple-faqs";
import { listSocialLinks } from "@/lib/db/temple-social-links";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { listRecentNotifications, countNotificationsFiltered, countStuckRetryingNotifications } from "@/lib/db/notifications";
import { getTenantMediaIdForType } from "@/lib/db/tenant-notification-media";
import { getNotificationMediaById, listNotificationMedia } from "@/lib/db/notification-media";
import { ChatbotSettingsTabs } from "@/features/chatbot-settings/chatbot-settings-tabs";
import { WhatsAppConnectionCard } from "@/features/chatbot-settings/whatsapp-connection-card";
import { SettingsSection } from "@/features/chatbot-settings/settings-section";
import { NotificationSettingsContent } from "@/features/chatbot-settings/notification-settings-content";
import { verifyResultToken } from "@/lib/whatsapp/onboarding-handoff";
import { PageHeader } from "@/components/page-header";
import { parsePageParam } from "@/lib/pagination";
import type { NotificationCategory, NotificationMedia, SupportedLanguage } from "@/types/db";

const NOTIFICATIONS_PAGE_SIZE = 50;

const CATEGORY_VALUES: NotificationCategory[] = [
  "birthday",
  "anniversary",
  "new_user",
  "devotee",
  "family",
  "event",
  "announcement",
  "platform",
];

async function resolveLinkedMedia(
  tenantId: string,
  notificationType: "birthday_devotee" | "anniversary_devotee" | "donation_thank_you",
): Promise<NotificationMedia | null> {
  const mediaId = await getTenantMediaIdForType(tenantId, notificationType);
  return mediaId ? getNotificationMediaById(tenantId, mediaId) : null;
}

interface ChatbotSettingsPageProps {
  searchParams: Promise<{
    whatsapp_connect_token?: string;
    whatsapp_connect_error?: string;
    category?: string;
    notifPage?: string;
  }>;
}

export default async function ChatbotSettingsPage({ searchParams }: ChatbotSettingsPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "whatsapp_chatbot");
  const t = await getTranslations("chatbotSettings");
  const locale = (await getLocale()) as SupportedLanguage;
  const params = await searchParams;

  const notificationsEnabled = await isFeatureEnabled(session.tenantId, "notifications");

  const { category: categoryParam, notifPage: notifPageParam } = params;
  const category = CATEGORY_VALUES.find((value) => value === categoryParam);
  const notifPage = parsePageParam(notifPageParam);

  const [tenant, specialDays, sevas, faqs, socialLinks, whatsappAccount, notificationData] = await Promise.all([
    getTenantById(session.tenantId),
    listSpecialDays(session.tenantId),
    listSevas(session.tenantId),
    listFaqs(session.tenantId),
    listSocialLinks(session.tenantId),
    getWhatsAppAccountByTenant(session.tenantId),
    notificationsEnabled
      ? Promise.all([
          listRecentNotifications(session.tenantId, { category, page: notifPage, pageSize: NOTIFICATIONS_PAGE_SIZE }),
          countNotificationsFiltered(session.tenantId, { category }),
          resolveLinkedMedia(session.tenantId, "birthday_devotee"),
          resolveLinkedMedia(session.tenantId, "anniversary_devotee"),
          resolveLinkedMedia(session.tenantId, "donation_thank_you"),
          listNotificationMedia(session.tenantId, "festival_greeting"),
          countStuckRetryingNotifications(session.tenantId),
        ])
      : null,
  ]);

  if (!tenant) return null;

  const decodedResult = params.whatsapp_connect_token ? verifyResultToken(params.whatsapp_connect_token) : null;
  const initialConnectResult =
    decodedResult && decodedResult.tenantId === session.tenantId
      ? { code: decodedResult.code, wabaId: decodedResult.wabaId, phoneNumberId: decodedResult.phoneNumberId }
      : null;
  const initialCancelled = params.whatsapp_connect_error === "cancelled";
  const isConnected = whatsappAccount !== null && whatsappAccount.status === "connected";

  const whatsappConnectionCard = (
    <WhatsAppConnectionCard
      account={whatsappAccount}
      initialConnectResult={initialConnectResult}
      initialCancelled={initialCancelled}
      compact={isConnected}
    />
  );

  const chatbotConfigSection = (
    <SettingsSection
      icon={<Settings2 className="size-4.5" />}
      title={t("sections.chatbotConfig.title")}
      description={t("sections.chatbotConfig.description")}
      defaultOpen
    >
      <ChatbotSettingsTabs tenant={tenant} specialDays={specialDays} sevas={sevas} faqs={faqs} socialLinks={socialLinks} />
    </SettingsSection>
  );

  const notificationSectionDefaultOpen = Boolean(
    category || notifPageParam || (notificationData && notificationData[6] > 0),
  );

  const notificationSection = notificationData && (
    <SettingsSection
      icon={<BellRing className="size-4.5" />}
      title={t("sections.notificationSettings.title")}
      description={t("sections.notificationSettings.description")}
      defaultOpen={notificationSectionDefaultOpen}
    >
      <NotificationSettingsContent
        automatedNotifications={notificationData[0]}
        category={category}
        notifPage={notifPage}
        pageSize={NOTIFICATIONS_PAGE_SIZE}
        automatedTotalCount={notificationData[1]}
        birthdayMedia={notificationData[2]}
        anniversaryMedia={notificationData[3]}
        donationMedia={notificationData[4]}
        festivalMedia={notificationData[5]}
        stuckRetrying={notificationData[6]}
        locale={locale}
      />
    </SettingsSection>
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageHeader.title")} subtitle={t("pageHeader.subtitle")} />

      {!isConnected && (
        <div className="glass-card space-y-1 rounded-2xl border-primary/30 bg-primary/5 p-4 sm:p-5">
          <p className="flex items-center gap-2 text-sm font-medium text-primary">
            <MessageCircle className="size-4" />
            {t("connectPrompt.title")}
          </p>
          <p className="text-sm text-muted-foreground">{t("connectPrompt.description")}</p>
        </div>
      )}

      {!isConnected && whatsappConnectionCard}

      {chatbotConfigSection}
      {notificationSection}

      {isConnected && whatsappConnectionCard}
    </div>
  );
}
