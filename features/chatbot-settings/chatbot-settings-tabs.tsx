"use client";

import { useTranslations } from "next-intl";
import type { Tenant, TempleFaq, TempleSeva, TempleSocialLink, TempleSpecialDay } from "@/types/db";
import type { NotificationListItem } from "@/lib/db/notifications";
import type { NotificationCategory, NotificationMedia, SupportedLanguage } from "@/types/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutomatedNotificationList } from "@/features/notifications/automated-notification-list";
import { NotificationSettingsContent } from "./notification-settings-content";
import { TempleInfoForm } from "./temple-info-form";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { TempleTimingsForm } from "./temple-timings-form";
import { SpecialDaysTable } from "./special-days-table";
import { SevasTable } from "./sevas-table";
import { ContactForm } from "./contact-form";
import { SocialLinksForm } from "./social-links-form";
import { FaqsTable } from "./faqs-table";

interface NotificationTabData {
  birthdayMedia: NotificationMedia | null;
  anniversaryMedia: NotificationMedia | null;
  donationMedia: NotificationMedia | null;
  festivalMedia: NotificationMedia[];
  stuckRetrying: number;
  automatedNotifications: NotificationListItem[];
  category?: NotificationCategory;
  notifPage: number;
  pageSize: number;
  automatedTotalCount: number;
  locale: SupportedLanguage;
}

export function ChatbotSettingsTabs({
  tenant,
  specialDays,
  sevas,
  faqs,
  socialLinks,
  notificationData,
  defaultTab = "info",
}: {
  tenant: Tenant;
  specialDays: TempleSpecialDay[];
  sevas: TempleSeva[];
  faqs: TempleFaq[];
  socialLinks: TempleSocialLink[];
  /** Null when the "notifications" tenant feature is disabled — the two notification tabs are omitted entirely in that case. */
  notificationData: NotificationTabData | null;
  defaultTab?: string;
}) {
  const t = useTranslations("chatbotSettings.tabs");
  return (
    <Tabs defaultValue={defaultTab} className="gap-4">
      <TabsList variant="line" scrollable className="w-full">
        <TabsTrigger value="info">{t("info")}</TabsTrigger>
        <TabsTrigger value="timings">{t("timings")}</TabsTrigger>
        <TabsTrigger value="sevas">{t("sevas")}</TabsTrigger>
        <TabsTrigger value="contact">{t("contact")}</TabsTrigger>
        <TabsTrigger value="faq">{t("faq")}</TabsTrigger>
        {notificationData && (
          <>
            <TabsTrigger value="notificationSettings">{t("notificationSettings")}</TabsTrigger>
            <TabsTrigger value="automatedNotifications">{t("automatedNotifications")}</TabsTrigger>
          </>
        )}
      </TabsList>

      <TabsContent value="info" className="space-y-4">
        <TempleInfoForm tenant={tenant} />
        <NotificationPreferencesForm tenant={tenant} />
      </TabsContent>

      <TabsContent value="timings" className="space-y-4">
        <TempleTimingsForm tenant={tenant} />
        <SpecialDaysTable specialDays={specialDays} />
      </TabsContent>

      <TabsContent value="sevas">
        <SevasTable sevas={sevas} />
      </TabsContent>

      <TabsContent value="contact" className="space-y-4">
        <ContactForm tenant={tenant} />
        <SocialLinksForm socialLinks={socialLinks} />
      </TabsContent>

      <TabsContent value="faq">
        <FaqsTable faqs={faqs} />
      </TabsContent>

      {notificationData && (
        <>
          <TabsContent value="notificationSettings">
            <NotificationSettingsContent
              birthdayMedia={notificationData.birthdayMedia}
              anniversaryMedia={notificationData.anniversaryMedia}
              donationMedia={notificationData.donationMedia}
              festivalMedia={notificationData.festivalMedia}
              stuckRetrying={notificationData.stuckRetrying}
            />
          </TabsContent>

          <TabsContent value="automatedNotifications">
            <AutomatedNotificationList
              notifications={notificationData.automatedNotifications}
              category={notificationData.category}
              page={notificationData.notifPage}
              pageSize={notificationData.pageSize}
              totalCount={notificationData.automatedTotalCount}
              locale={notificationData.locale}
              pathname="/dashboard/chatbot-settings"
            />
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
