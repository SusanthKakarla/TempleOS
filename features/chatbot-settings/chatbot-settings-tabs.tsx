"use client";

import type { Tenant, TempleFaq, TempleSeva, TempleSocialLink, TempleSpecialDay } from "@/types/db";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TempleInfoForm } from "./temple-info-form";
import { NotificationPreferencesForm } from "./notification-preferences-form";
import { TempleTimingsForm } from "./temple-timings-form";
import { SpecialDaysTable } from "./special-days-table";
import { SevasTable } from "./sevas-table";
import { ContactForm } from "./contact-form";
import { SocialLinksForm } from "./social-links-form";
import { FaqsTable } from "./faqs-table";

export function ChatbotSettingsTabs({
  tenant,
  specialDays,
  sevas,
  faqs,
  socialLinks,
}: {
  tenant: Tenant;
  specialDays: TempleSpecialDay[];
  sevas: TempleSeva[];
  faqs: TempleFaq[];
  socialLinks: TempleSocialLink[];
}) {
  return (
    <Tabs defaultValue="info" className="gap-4">
      <TabsList className="w-full sm:w-fit">
        <TabsTrigger value="info">Temple Info</TabsTrigger>
        <TabsTrigger value="timings">Timings</TabsTrigger>
        <TabsTrigger value="sevas">Sevas</TabsTrigger>
        <TabsTrigger value="contact">Contact &amp; Social</TabsTrigger>
        <TabsTrigger value="faq">FAQ</TabsTrigger>
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
    </Tabs>
  );
}
