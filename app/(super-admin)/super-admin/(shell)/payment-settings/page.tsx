import { CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { listPaymentProviders } from "@/lib/db/payment-providers";
import {
  PaymentProviderSettingsTable,
  PlatformCredentialStatus,
} from "@/features/super-admin/payment-provider-settings-table";
import { requireSuperAdminPage } from "../../require-super-admin";

/**
 * The first platform-wide payment settings surface in this app — previously
 * `payment_providers.status` (Razorpay/PhonePe availability) was only
 * settable via a raw migration/SQL, no UI existed at all. Platform
 * credentials themselves (client id/secret/webhook secret/URLs) stay
 * env-var-only, same as the existing Razorpay Partner OAuth precedent —
 * this page shows only whether each is configured, never its value. See
 * docs/EL10-PHONEPE-PARTNER-READINESS.md for the full architecture.
 */
export default async function SuperAdminPaymentSettingsPage() {
  await requireSuperAdminPage("/super-admin/payment-settings");
  const providers = await listPaymentProviders();

  const phonepeCredentials = [
    { label: "PHONEPE_PLATFORM_CLIENT_ID", configured: Boolean(process.env.PHONEPE_PLATFORM_CLIENT_ID) },
    { label: "PHONEPE_PLATFORM_CLIENT_SECRET", configured: Boolean(process.env.PHONEPE_PLATFORM_CLIENT_SECRET) },
    { label: "PHONEPE_PLATFORM_CALLBACK_URL", configured: Boolean(process.env.PHONEPE_PLATFORM_CALLBACK_URL) },
    { label: "PHONEPE_PLATFORM_REDIRECT_URL", configured: Boolean(process.env.PHONEPE_PLATFORM_REDIRECT_URL) },
    { label: "PHONEPE_PLATFORM_WEBHOOK_URL", configured: Boolean(process.env.PHONEPE_PLATFORM_WEBHOOK_URL) },
    { label: "PHONEPE_PLATFORM_WEBHOOK_SECRET", configured: Boolean(process.env.PHONEPE_PLATFORM_WEBHOOK_SECRET) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Payment Settings"
        subtitle="Global payment provider availability and connection modes — applies to every temple."
      />

      <PaymentProviderSettingsTable providers={providers} />

      <div className="glass-card space-y-3 rounded-2xl p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CreditCard className="size-4 text-muted-foreground" />
          PhonePe Partner platform configuration
        </div>
        <p className="text-sm text-muted-foreground">
          Not yet available — PhonePe has no public Partner Onboarding API today. These
          environment variables are documented for when that changes; none are set yet, so
          Partner Onboarding stays off regardless of the toggle above.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {phonepeCredentials.map((item) => (
            <PlatformCredentialStatus key={item.label} label={item.label} configured={item.configured} />
          ))}
        </div>
      </div>
    </div>
  );
}
