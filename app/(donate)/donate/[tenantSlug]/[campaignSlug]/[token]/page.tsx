import type { Metadata } from "next";
import { loadDonationCheckoutContext } from "@/lib/payments/donation-checkout-service";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { buildDonationLink, computeRaisedPercentage } from "@/lib/campaigns/donation-message";
import { formatInr } from "@/lib/currency";
import { Progress } from "@/components/ui/progress";
import { DonationCheckoutForm } from "@/features/payments/donation-checkout-form";
import { ShareButton } from "@/features/payments/share-button";

interface PageParams {
  params: Promise<{ tenantSlug: string; campaignSlug: string; token: string }>;
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DonatePage({ params }: PageParams) {
  const { tenantSlug, campaignSlug, token } = await params;
  const context = await loadDonationCheckoutContext(tenantSlug, campaignSlug, token);

  if (!context) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-lg font-semibold">This donation link isn&apos;t available</p>
        <p className="text-sm text-muted-foreground">
          It may have expired, or the campaign may no longer be accepting donations. Please contact the temple directly.
        </p>
      </div>
    );
  }

  const { tenant, campaign, summary } = context;
  const banner = campaign.bannerMediaId ? await getNotificationMediaById(tenant.id, campaign.bannerMediaId) : null;
  const goal = Number(campaign.goalAmount ?? 0);
  const rawPercentage = computeRaisedPercentage(summary.totalAmount, goal);
  const displayPercentage = Math.min(100, Math.round(rawPercentage));

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">{tenant.name}</p>
      </div>

      <div className="overflow-hidden rounded-2xl border bg-background shadow-sm">
        {banner && (
          // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a local asset
          <img src={banner.imageUrl} alt="" className="h-48 w-full object-cover" />
        )}
        <div className="space-y-4 p-6">
          <div>
            <h1 className="text-xl font-semibold">{campaign.title}</h1>
            {campaign.description && <p className="mt-1 text-sm text-muted-foreground">{campaign.description}</p>}
          </div>

          {goal > 0 && (
            <div className="space-y-2">
              <Progress value={displayPercentage} />
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{formatInr(summary.totalAmount)} raised</span>
                <span className="text-muted-foreground">of {formatInr(goal)} goal</span>
              </div>
            </div>
          )}

          <ShareButton title={campaign.title} url={buildDonationLink(tenant, campaign)} />
        </div>
      </div>

      <div className="mt-6">
        <DonationCheckoutForm tenantSlug={tenantSlug} campaignSlug={campaignSlug} token={token} templeName={tenant.name} />
      </div>
    </div>
  );
}
