import { getTranslations } from "next-intl/server";
import { requireDashboardAdmin } from "../../require-dashboard-admin";
import { requireTenantFeature } from "@/lib/auth/features";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { PageHeader } from "@/components/page-header";
import { RazorpayConnectionCard } from "@/features/payments/razorpay-connection-card";

export default async function PaymentSettingsPage() {
  const session = await requireDashboardAdmin();
  await requireTenantFeature(session.tenantId, "donations");
  const t = await getTranslations("paymentSettings");

  const account = await getActivePaymentAccountForTenant(session.tenantId);

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageHeader.title")} subtitle={t("pageHeader.subtitle")} />
      <RazorpayConnectionCard account={account} />
    </div>
  );
}
