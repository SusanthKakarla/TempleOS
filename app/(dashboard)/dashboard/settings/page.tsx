import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../require-dashboard-admin";
import { isFeatureEnabled } from "@/lib/db/tenant-features";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { listPaymentProviders } from "@/lib/db/payment-providers";
import { verifyResultToken } from "@/lib/whatsapp/onboarding-handoff";
import { getTenantWebsite } from "@/lib/db/tenant-websites";
import { getWebsiteHostnameForTenant } from "@/lib/db/tenant-domains";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { listSiteGallery } from "@/lib/site/site-data";
import { PageHeader } from "@/components/page-header";
import { WebsiteSettingsSection } from "@/features/website/website-settings-section";
import { WhatsAppConnectionCard } from "@/features/chatbot-settings/whatsapp-connection-card";
import { PaymentSettingsSection } from "@/features/payments/payment-settings-section";

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

  const [whatsappAccount, paymentAccount, paymentProviders] = await Promise.all([
    whatsappEnabled ? getWhatsAppAccountByTenant(session.tenantId) : Promise.resolve(null),
    paymentsEnabled ? getActivePaymentAccountForTenant(session.tenantId) : Promise.resolve(null),
    paymentsEnabled ? listPaymentProviders() : Promise.resolve([]),
  ]);

  const [website, websiteHostname] = await Promise.all([
    getTenantWebsite(session.tenantId),
    getWebsiteHostnameForTenant(session.tenantId),
  ]);
  // Media ids are resolved against this tenant's own media, so a stale id can
  // only ever resolve to null — never to another temple's image.
  const galleryImages = (await listSiteGallery(session.tenantId)).map((image) => ({
    id: image.id,
    imageUrl: image.url,
    title: image.title,
  }));

  const websiteMedia = {
    deity: website?.deityMediaId ? await getNotificationMediaById(session.tenantId, website.deityMediaId) : null,
    hero: website?.heroMediaId ? await getNotificationMediaById(session.tenantId, website.heroMediaId) : null,
    logo: website?.logoMediaId ? await getNotificationMediaById(session.tenantId, website.logoMediaId) : null,
    og: website?.ogMediaId ? await getNotificationMediaById(session.tenantId, website.ogMediaId) : null,
  };

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

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Public website</h2>
        <WebsiteSettingsSection
          website={website}
          media={websiteMedia}
          websiteUrl={websiteHostname ? `https://${websiteHostname}` : null}
          galleryImages={galleryImages}
        />
      </section>

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
          <PaymentSettingsSection account={paymentAccount} providers={paymentProviders} />
        </section>
      )}
    </div>
  );
}
