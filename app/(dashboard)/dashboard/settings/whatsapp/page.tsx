import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { verifyResultToken } from "@/lib/whatsapp/onboarding-handoff";
import { PageHeader } from "@/components/page-header";
import { WhatsAppConnectionCard } from "@/features/chatbot-settings/whatsapp-connection-card";

interface WhatsAppSettingsPageProps {
  searchParams: Promise<{ whatsapp_connect_token?: string; whatsapp_connect_error?: string }>;
}

export default async function WhatsAppSettingsPage({ searchParams }: WhatsAppSettingsPageProps) {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "whatsapp_chatbot");
  const t = await getTranslations("whatsappSettings");
  const params = await searchParams;

  const whatsappAccount = await getWhatsAppAccountByTenant(session.tenantId);

  const decodedResult = params.whatsapp_connect_token ? verifyResultToken(params.whatsapp_connect_token) : null;
  const initialConnectResult =
    decodedResult && decodedResult.tenantId === session.tenantId
      ? { code: decodedResult.code, wabaId: decodedResult.wabaId, phoneNumberId: decodedResult.phoneNumberId }
      : null;
  const initialCancelled = params.whatsapp_connect_error === "cancelled";

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageHeader.title")} subtitle={t("pageHeader.subtitle")} />
      <WhatsAppConnectionCard
        account={whatsappAccount}
        initialConnectResult={initialConnectResult}
        initialCancelled={initialCancelled}
      />
    </div>
  );
}
