import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { getTenantById } from "@/lib/db/tenants";
import { listSpecialDays } from "@/lib/db/temple-special-days";
import { listSevas } from "@/lib/db/temple-sevas";
import { listFaqs } from "@/lib/db/temple-faqs";
import { listSocialLinks } from "@/lib/db/temple-social-links";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { ChatbotSettingsTabs } from "@/features/chatbot-settings/chatbot-settings-tabs";
import { WhatsAppConnectionCard } from "@/features/chatbot-settings/whatsapp-connection-card";
import { verifyResultToken } from "@/lib/whatsapp/onboarding-handoff";

interface ChatbotSettingsPageProps {
  searchParams: Promise<{ whatsapp_connect_token?: string; whatsapp_connect_error?: string }>;
}

export default async function ChatbotSettingsPage({ searchParams }: ChatbotSettingsPageProps) {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("chatbotSettings.pageHeader");
  const params = await searchParams;

  const [tenant, specialDays, sevas, faqs, socialLinks, whatsappAccount] = await Promise.all([
    getTenantById(session.tenantId),
    listSpecialDays(session.tenantId),
    listSevas(session.tenantId),
    listFaqs(session.tenantId),
    listSocialLinks(session.tenantId),
    getWhatsAppAccountByTenant(session.tenantId),
  ]);

  if (!tenant) return null;

  const decodedResult = params.whatsapp_connect_token
    ? verifyResultToken(params.whatsapp_connect_token)
    : null;
  const initialConnectResult =
    decodedResult && decodedResult.tenantId === session.tenantId
      ? {
          code: decodedResult.code,
          wabaId: decodedResult.wabaId,
          phoneNumberId: decodedResult.phoneNumberId,
        }
      : null;
  const initialCancelled = params.whatsapp_connect_error === "cancelled";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <WhatsAppConnectionCard
        account={whatsappAccount}
        initialConnectResult={initialConnectResult}
        initialCancelled={initialCancelled}
      />
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
