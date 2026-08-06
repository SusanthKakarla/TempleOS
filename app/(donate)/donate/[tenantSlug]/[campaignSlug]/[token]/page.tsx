import type { Metadata } from "next";
import { CalendarClock, CalendarX2, PauseCircle, SearchX } from "lucide-react";
import { resolveDonationCheckoutAvailability } from "@/lib/payments/donation-checkout-service";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { buildDonationLink, computeDaysLeft, DEFAULT_DESCRIPTION } from "@/lib/campaigns/donation-message";
import { EmptyState } from "@/components/empty-state";
import { DonationCheckoutForm } from "@/features/payments/donation-checkout-form";
import { DonateHero } from "@/features/payments/donate/donate-hero";
import { DonateStory } from "@/features/payments/donate/donate-story";
import { DonateTrust } from "@/features/payments/donate/donate-trust";
import { DonateFooter } from "@/features/payments/donate/donate-footer";

interface PageParams {
  params: Promise<{ tenantSlug: string; campaignSlug: string; token: string }>;
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

const UNAVAILABLE_COPY = {
  not_found: {
    icon: <SearchX className="size-6" />,
    title: "This donation link isn't available",
    description: "It may be incorrect, or the campaign may no longer exist. Please contact the temple directly.",
  },
  not_started: {
    icon: <CalendarClock className="size-6" />,
    title: "This campaign hasn't started yet",
    description: "Donations will open once the campaign begins. Please check back later.",
  },
  disabled: {
    icon: <PauseCircle className="size-6" />,
    title: "This campaign isn't accepting donations right now",
    description: "The temple has paused or closed this campaign. Please check back later or contact the temple directly.",
  },
  expired: {
    icon: <CalendarX2 className="size-6" />,
    title: "This campaign has ended",
    description: "The donation window for this campaign has closed. Please contact the temple directly for other ways to give.",
  },
  payment_not_configured: {
    icon: <PauseCircle className="size-6" />,
    title: "This campaign isn't accepting donations right now",
    description: "The temple hasn't finished setting up online payments yet. Please check back later or contact the temple directly.",
  },
} as const;

const SUBTITLE_MAX_LENGTH = 120;

export default async function DonatePage({ params }: PageParams) {
  const { tenantSlug, campaignSlug, token } = await params;
  const availability = await resolveDonationCheckoutAvailability(tenantSlug, campaignSlug, token);

  if (!availability.ok) {
    const copy = UNAVAILABLE_COPY[availability.reason];
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <EmptyState icon={copy.icon} title={copy.title} description={copy.description} />
      </div>
    );
  }

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
      />

      {description && (
        <div className="mt-8">
          <DonateStory imageUrl={banner?.imageUrl ?? null} description={description} />
        </div>
      )}

      <div className="mt-8 px-5 md:px-6">
        <DonationCheckoutForm tenantSlug={tenantSlug} campaignSlug={campaignSlug} token={token} templeName={tenant.name} />
      </div>

      <div className="mt-6">
        <DonateTrust providerKey={account.providerKey} />
      </div>

      <DonateFooter templeName={tenant.name} />
    </div>
  );
}
