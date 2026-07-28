import type { Metadata } from "next";
import { CalendarClock, CalendarX2, PauseCircle, SearchX } from "lucide-react";
import { resolveDonationCheckoutAvailability } from "@/lib/payments/donation-checkout-service";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { buildDonationLink, computeRaisedPercentage } from "@/lib/campaigns/donation-message";
import { formatInr } from "@/lib/currency";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/empty-state";
import { DonationCheckoutForm } from "@/features/payments/donation-checkout-form";
import { ShareButton } from "@/features/payments/share-button";

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

function TempleMonogram({ name }: { name: string }) {
  const initial = name.trim().charAt(0).toUpperCase() || "T";
  return (
    <div className="gradient-blue-purple flex size-12 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-sm">
      {initial}
    </div>
  );
}

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

  const { tenant, campaign, summary } = availability.context;
  const banner = campaign.bannerMediaId ? await getNotificationMediaById(tenant.id, campaign.bannerMediaId) : null;
  const goal = Number(campaign.goalAmount ?? 0);
  const rawPercentage = computeRaisedPercentage(summary.totalAmount, goal);
  const displayPercentage = Math.min(100, Math.round(rawPercentage));

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <TempleMonogram name={tenant.name} />
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
