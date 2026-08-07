import type { Metadata } from "next";
import { SearchX } from "lucide-react";
import { resolveDonationCheckoutAvailability } from "@/lib/payments/donation-checkout-service";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { buildDonationLink, computeDaysLeft, DEFAULT_DESCRIPTION } from "@/lib/campaigns/donation-message";
import { EmptyState } from "@/components/empty-state";
import { DonationCheckoutForm } from "@/features/payments/donation-checkout-form";
import { DonateHero } from "@/features/payments/donate/donate-hero";
import { DonateWhyMatters } from "@/features/payments/donate/donate-why-matters";
import { DonateTrust } from "@/features/payments/donate/donate-trust";
import { DonateContributionSupports } from "@/features/payments/donate/donate-contribution-supports";
import { DonateTrustCards } from "@/features/payments/donate/donate-trust-cards";
import { DonateStats } from "@/features/payments/donate/donate-stats";
import { DonateFooter } from "@/features/payments/donate/donate-footer";

interface PageParams {
  params: Promise<{ tenantSlug: string; campaignSlug: string; token: string }>;
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

const NOT_FOUND_COPY = {
  icon: <SearchX className="size-6" />,
  title: "This donation link isn't available",
  description: "It may be incorrect, or the campaign may no longer exist. Please contact the temple directly.",
};

const SUBTITLE_MAX_LENGTH = 120;

export default async function DonatePage({ params }: PageParams) {
  const { tenantSlug, campaignSlug, token } = await params;
  const availability = await resolveDonationCheckoutAvailability(tenantSlug, campaignSlug, token);

  if (!availability.ok) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <EmptyState icon={NOT_FOUND_COPY.icon} title={NOT_FOUND_COPY.title} description={NOT_FOUND_COPY.description} />
      </div>
    );
  }

  const { canDonate, blockedReason } = availability;
  const { tenant, campaign, account, summary } = availability.context;
  const banner = campaign.bannerMediaId ? await getNotificationMediaById(tenant.id, campaign.bannerMediaId) : null;
  const goal = Number(campaign.goalAmount ?? 0);
  const description = campaign.description?.trim() || null;
  const subtitle = !description
    ? DEFAULT_DESCRIPTION.en
    : description.length <= SUBTITLE_MAX_LENGTH
      ? description
      : `${description.slice(0, SUBTITLE_MAX_LENGTH - 1).trimEnd()}…`;

  const daysLeft = computeDaysLeft(campaign.campaignEndDate);

  return (
    <div>
      <DonateHero
        templeName={tenant.name}
        campaignTitle={campaign.title}
        subtitle={subtitle}
        bannerUrl={banner?.imageUrl ?? null}
        raisedAmount={summary.totalAmount}
        goalAmount={goal}
        donorCount={summary.donorCount}
        daysLeft={daysLeft}
        shareUrl={buildDonationLink(tenant, campaign)}
        canDonate={canDonate}
        blockedReason={blockedReason}
      />

      <DonateWhyMatters />

      <div className="mt-8 px-5 md:px-6">
        <DonationCheckoutForm
          tenantSlug={tenantSlug}
          campaignSlug={campaignSlug}
          token={token}
          templeName={tenant.name}
          upi={
            account && account.providerKey === "upi_manual" && account.upiVpa && account.payeeName
              ? { vpa: account.upiVpa, payeeName: account.payeeName, qrCodeUrl: account.qrCodeUrl }
              : null
          }
          canDonate={canDonate}
          blockedReason={blockedReason}
        />
      </div>

      <div className="mt-6">
        <DonateTrust providerKey={account?.providerKey ?? null} />
      </div>

      <DonateContributionSupports />

      <DonateTrustCards />

      <DonateStats />

      <DonateFooter templeName={tenant.name} contactPhone={tenant.defaultContactPhone} />
    </div>
  );
}
