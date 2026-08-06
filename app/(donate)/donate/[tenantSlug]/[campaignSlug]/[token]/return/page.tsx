import type { Metadata } from "next";
import { CheckCircle2, Clock, SearchX, XCircle } from "lucide-react";
import { getTenantBySlug } from "@/lib/db/tenants";
import { getCampaignBySlugForTenant } from "@/lib/db/campaigns";
import { getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { getTransactionByProviderOrderId } from "@/lib/db/payment-transactions";
import { fetchOrderPaymentForTenant } from "@/lib/payments/payment-provider-service";
import { applyPaymentEvent } from "@/lib/payments/campaign-payment-service";
import { constantTimeEqual } from "@/lib/payments/crypto";
import { EmptyState } from "@/components/empty-state";

interface PageParams {
  params: Promise<{ tenantSlug: string; campaignSlug: string; token: string }>;
  searchParams: Promise<{ order?: string }>;
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Where a redirect-based provider (PhonePe) sends the browser back after
 * checkout. This page is purely informational for the donor — it never
 * itself creates the donation/receipt (that stays the webhook's job, see
 * campaign-payment-service.ts's own doc comments on idempotency). It does
 * make one live Order Status call and, ONLY if that shows a capture the
 * webhook hasn't recorded yet (a real possibility — this page can render
 * before the webhook arrives), applies it through the exact same idempotent
 * `applyPaymentEvent` path the webhook itself uses, so a donor who lands
 * here first still gets an accurate "thank you" without waiting on webhook
 * delivery, and the webhook's own later (redundant) delivery is a safe no-op.
 */
export default async function DonationReturnPage({ params, searchParams }: PageParams) {
  const { tenantSlug, campaignSlug, token } = await params;
  const { order } = await searchParams;

  const notAvailable = (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
      <EmptyState
        icon={<SearchX className="size-6" />}
        title="We couldn't find this payment"
        description="If you completed a payment, it will still be recorded — please check with the temple if you don't receive a confirmation shortly."
      />
    </div>
  );

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant || !order) return notAvailable;

  const campaign = await getCampaignBySlugForTenant(tenant.id, campaignSlug);
  if (!campaign || !constantTimeEqual(campaign.donationToken, token)) return notAvailable;

  const account = await getActivePaymentAccountForTenant(tenant.id);
  if (!account) return notAvailable;

  const transaction = await getTransactionByProviderOrderId(account.id, order);
  if (!transaction) return notAvailable;

  let status = transaction.status;
  if (status !== "captured" && status !== "refunded") {
    const live = await fetchOrderPaymentForTenant(tenant.id, order);
    if (live?.capturedPaymentId) {
      await applyPaymentEvent(account.id, order, { type: "captured", providerPaymentId: live.capturedPaymentId });
      status = "captured";
    }
  }

  if (status === "captured" || status === "refunded") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <CheckCircle2 className="size-10 text-emerald-600" />
        <p className="text-lg font-semibold">Thank you for your donation!</p>
        <p className="text-sm text-muted-foreground">A confirmation and receipt will be sent to you shortly.</p>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <XCircle className="size-10 text-destructive" />
        <p className="text-lg font-semibold">Your payment didn&apos;t go through</p>
        <p className="text-sm text-muted-foreground">No amount was deducted. Please go back and try again.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <Clock className="size-10 text-muted-foreground" />
      <p className="text-lg font-semibold">Confirming your payment...</p>
      <p className="text-sm text-muted-foreground">
        This can take a minute. You&apos;ll get a WhatsApp confirmation once it&apos;s done — no need to try again.
      </p>
    </div>
  );
}
