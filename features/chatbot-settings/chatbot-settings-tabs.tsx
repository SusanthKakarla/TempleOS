"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { Tenant, TempleFaq, TempleSeva, TempleSocialLink, TempleSpecialDay, WhatsAppMessageTemplate } from "@/types/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TempleInfoForm } from "./temple-info-form";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { TempleTimingsForm } from "./temple-timings-form";
import { SpecialDaysTable } from "./special-days-table";
import { SevasTable } from "./sevas-table";
import { ContactForm } from "./contact-form";
import { SocialLinksForm } from "./social-links-form";
import { FaqsTable } from "./faqs-table";
import { WhatsAppTemplatesTab } from "./whatsapp-templates-tab";

export function ChatbotSettingsTabs({
  tenant,
  specialDays,
  sevas,
  faqs,
  socialLinks,
  notificationSettingsSlot,
  automatedNotificationsSlot,
  whatsappTemplates,
  whatsappConnected,
  whatsappConnectionSlot,
  defaultTab = "info",
}: {
  tenant: Tenant;
  specialDays: TempleSpecialDay[];
  sevas: TempleSeva[];
  faqs: TempleFaq[];
  socialLinks: TempleSocialLink[];
  /**
   * Pre-rendered by the parent Server Component page — these are async Server
   * Components (NotificationSettingsContent / AutomatedNotificationList), which
   * can't be imported and rendered directly inside this Client Component. Null
   * when the "notifications" tenant feature is disabled — both tabs are
   * omitted entirely in that case.
   */
  notificationSettingsSlot: ReactNode | null;
  automatedNotificationsSlot: ReactNode | null;
  /** Plain data (not pre-rendered JSX) — WhatsAppTemplatesTab is itself a Client Component, so it's safe to import and render directly here, unlike the two Server Components above. */
  whatsappTemplates: WhatsAppMessageTemplate[];
  whatsappConnected: boolean;
  /** Pre-rendered WhatsApp connection card from the server page (client component rendered server-side with URL param data). */
  whatsappConnectionSlot: ReactNode;
  defaultTab?: string;
}) {
  const t = useTranslations("chatbotSettings.tabs");
  return (
    <Tabs defaultValue={defaultTab} className="gap-4">
      <div className="relative">
        <TabsList variant="line" scrollable className="w-full pr-8">

        <TabsTrigger value="info">{t("info")}</TabsTrigger>
        <TabsTrigger value="timings">{t("timings")}</TabsTrigger>
        <TabsTrigger value="sevas">{t("sevas")}</TabsTrigger>
        <TabsTrigger value="contact">{t("contact")}</TabsTrigger>
        <TabsTrigger value="faq">{t("faq")}</TabsTrigger>
        {notificationSettingsSlot && (
          <>
            <TabsTrigger value="notificationSettings">{t("notificationSettings")}</TabsTrigger>
            <TabsTrigger value="automatedNotifications">{t("automatedNotifications")}</TabsTrigger>
          </>
        )}
        <TabsTrigger value="whatsappTemplates">{t("whatsappTemplates")}</TabsTrigger>
        </TabsList>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-background to-transparent" />
      </div>

      <TabsContent value="info" className="space-y-6">
        <TempleInfoForm tenant={tenant} />
        <div className="border-t" />
        <NotificationPreferencesForm tenant={tenant} />
      </TabsContent>

      <TabsContent value="timings" className="space-y-6">
        <TempleTimingsForm tenant={tenant} />
        <div className="border-t" />
        <SpecialDaysTable specialDays={specialDays} />
      </TabsContent>

      <TabsContent value="sevas">
        <SevasTable sevas={sevas} />
      </TabsContent>

      <TabsContent value="contact" className="space-y-6">
        <ContactForm tenant={tenant} />
        <div className="border-t" />
        <SocialLinksForm socialLinks={socialLinks} />
      </TabsContent>

      <TabsContent value="faq">
        <FaqsTable faqs={faqs} />
      </TabsContent>

      {notificationSettingsSlot && (
        <>
          <TabsContent value="notificationSettings">{notificationSettingsSlot}</TabsContent>
          <TabsContent value="automatedNotifications">{automatedNotificationsSlot}</TabsContent>
        </>
      )}

      <TabsContent value="whatsappTemplates" className="space-y-6">
        {whatsappConnectionSlot}
        <WhatsAppTemplatesTab templates={whatsappTemplates} whatsappConnected={whatsappConnected} />
      </TabsContent>
    </Tabs>
  );
}
