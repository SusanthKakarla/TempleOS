import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { isFeatureEnabled } from "@/lib/db/tenant-features";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { verifyResultToken } from "@/lib/whatsapp/onboarding-handoff";
import { PageHeader } from "@/components/page-header";
import { WhatsAppConnectionCard } from "@/features/chatbot-settings/whatsapp-connection-card";
import { RazorpayConnectionCard } from "@/features/payments/razorpay-connection-card";

interface SettingsPageProps {
  searchParams: Promise<{ whatsapp_connect_token?: string; whatsapp_connect_error?: string }>;
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const session = await requireDashboardAdmin();
  const t = await getTranslations("settings");
  const params = await searchParams;

  const [paymentsEnabled, whatsappEnabled] = await Promise.all([
    isFeatureEnabled(session.tenantId, "donations"),
    isFeatureEnabled(session.tenantId, "whatsapp_chatbot"),
  ]);

  const [whatsappAccount, paymentAccount] = await Promise.all([
    whatsappEnabled ? getWhatsAppAccountByTenant(session.tenantId) : Promise.resolve(null),
    paymentsEnabled ? getActivePaymentAccountForTenant(session.tenantId) : Promise.resolve(null),
  ]);

  const decodedResult = params.whatsapp_connect_token ? verifyResultToken(params.whatsapp_connect_token) : null;
  const initialConnectResult =
    decodedResult && decodedResult.tenantId === session.tenantId
      ? {
          code: decodedResult.code,
          wabaId: decodedResult.wabaId,
          phoneNumberId: decodedResult.phoneNumberId,
          businessId: decodedResult.businessId,
        }
      : null;
  const initialCancelled = params.whatsapp_connect_error === "cancelled";

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageHeader.title")} subtitle={t("pageHeader.subtitle")} />

      {whatsappEnabled && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("whatsappSection")}</h2>
          <WhatsAppConnectionCard
            account={whatsappAccount}
            initialConnectResult={initialConnectResult}
            initialCancelled={initialCancelled}
          />
        </section>
      )}

      {paymentsEnabled && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">{t("paymentsSection")}</h2>
          <RazorpayConnectionCard account={paymentAccount} />
        </section>
      )}
    </div>
  );
}
