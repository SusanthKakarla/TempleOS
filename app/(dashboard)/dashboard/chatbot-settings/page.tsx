import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { getTenantById } from "@/lib/db/tenants";
import { listSpecialDays } from "@/lib/db/temple-special-days";
import { listSevas } from "@/lib/db/temple-sevas";
import { listFaqs } from "@/lib/db/temple-faqs";
import { listSocialLinks } from "@/lib/db/temple-social-links";
import { ChatbotSettingsTabs } from "@/features/chatbot-settings/chatbot-settings-tabs";

export default async function ChatbotSettingsPage() {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("chatbotSettings.pageHeader");

  const [tenant, specialDays, sevas, faqs, socialLinks] = await Promise.all([
    getTenantById(session.tenantId),
    listSpecialDays(session.tenantId),
    listSevas(session.tenantId),
    listFaqs(session.tenantId),
    listSocialLinks(session.tenantId),
  ]);

  if (!tenant) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <ChatbotSettingsTabs
        tenant={tenant}
        specialDays={specialDays}
        sevas={sevas}
        faqs={faqs}
        socialLinks={socialLinks}
      />
    </div>
  );
}
