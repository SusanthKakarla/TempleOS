import type { Metadata } from "next";
import { CalendarClock, CalendarX2, Eye, PauseCircle, SearchX } from "lucide-react";
import { resolveDonationCheckoutAvailability } from "@/lib/payments/donation-checkout-service";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { listCampaignGallery } from "@/lib/db/campaign-media";
import { listSocialLinks } from "@/lib/db/temple-social-links";
import { buildDonationLink, DEFAULT_DESCRIPTION } from "@/lib/campaigns/donation-message";
import { computeDaysLeftInTimeZone } from "@/lib/campaigns/campaign-visibility";
import { resolveCampaignHeroImage, resolveCampaignTheme } from "@/lib/campaigns/campaign-theme";
import { canPreviewCampaignAsAdmin } from "@/lib/campaigns/campaign-preview-access";
import { CAMPAIGN_PREVIEW_PARAM } from "@/lib/campaigns/campaign-preview-token";
import { EmptyState } from "@/components/empty-state";
import { DonationCheckoutForm } from "@/features/payments/donation-checkout-form";
import { DonateHero } from "@/features/payments/donate/donate-hero";
import { DonateStory } from "@/features/payments/donate/donate-story";
import { DonateImpact } from "@/features/payments/donate/donate-impact";
import { DonateGallery } from "@/features/payments/donate/donate-gallery";
import { DonateTrust } from "@/features/payments/donate/donate-trust";
import { DonateTrustCards } from "@/features/payments/donate/donate-trust-cards";
import { DonateStats } from "@/features/payments/donate/donate-stats";
import { DonateStickyBar } from "@/features/payments/donate/donate-sticky-bar";
import { DonateCta } from "@/features/payments/donate/donate-cta";
import { DonateFooter } from "@/features/payments/donate/donate-footer";

interface PageParams {
  params: Promise<{ tenantSlug: string; campaignSlug: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

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

/** What the admin is told the public currently sees, per blocked reason. */
const PREVIEW_NOTICE: Record<keyof typeof UNAVAILABLE_COPY, string> = {
  not_found: "Visitors can't open this link yet.",
  not_started: "Visitors see \"this campaign hasn't started yet\" until the start date arrives.",
  disabled: "Visitors can't donate — this campaign is archived or cancelled.",
  expired: "Visitors see \"this campaign has ended\" — the end date has passed.",
  payment_not_configured: "Visitors can't donate yet — online payments aren't enabled for this temple.",
};

const SUBTITLE_MAX_LENGTH = 120;

function buildSubtitle(description: string | null): string {
  if (!description) return DEFAULT_DESCRIPTION.en;
  return description.length <= SUBTITLE_MAX_LENGTH
    ? description
    : `${description.slice(0, SUBTITLE_MAX_LENGTH - 1).trimEnd()}…`;
}

/**
 * Rich link preview for WhatsApp, where nearly every donor first meets this
 * page. `robots: noindex` is retained — an unguessable donation token must
 * never enter a search index — which does not affect the OG unfurl.
 */
export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { tenantSlug, campaignSlug, token } = await params;
  const availability = await resolveDonationCheckoutAvailability(tenantSlug, campaignSlug, token);
  const robots = { index: false, follow: false };

  if (!availability.ok) return { title: "Donate", robots };

  const { tenant, campaign } = availability.context;
  const theme = resolveCampaignTheme(campaign.linkedDonationPurpose, campaign.title);
  const banner = campaign.bannerMediaId ? await getNotificationMediaById(tenant.id, campaign.bannerMediaId) : null;
  const title = `${campaign.title} — ${tenant.name}`;
  const description = buildSubtitle(campaign.description?.trim() || null);

  return {
    title,
    description,
    robots,
    openGraph: {
      title,
      description,
      type: "website",
      url: buildDonationLink(tenant, campaign),
      images: [resolveCampaignHeroImage(banner?.imageUrl, theme)],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DonatePage({ params, searchParams }: PageParams) {
  const { tenantSlug, campaignSlug, token } = await params;
  const previewParam = (await searchParams)[CAMPAIGN_PREVIEW_PARAM];
  const preview = await canPreviewCampaignAsAdmin(
    tenantSlug,
    campaignSlug,
    typeof previewParam === "string" ? previewParam : null,
  );
  const availability = await resolveDonationCheckoutAvailability(tenantSlug, campaignSlug, token, { preview });

  if (!availability.ok) {
    const copy = UNAVAILABLE_COPY[availability.reason];
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <EmptyState icon={copy.icon} title={copy.title} description={copy.description} />
      </div>
    );
  }

  const { tenant, campaign, account, summary, previewBlockedReason } = availability.context;
  const [banner, gallery, socialLinks] = await Promise.all([
    campaign.bannerMediaId ? getNotificationMediaById(tenant.id, campaign.bannerMediaId) : Promise.resolve(null),
    listCampaignGallery(tenant.id, campaign.id),
    listSocialLinks(tenant.id),
  ]);

  // Everything visual about this campaign — badge, accent, gradient, hero
  // artwork, impact points — resolves from this one theme lookup.
  const theme = resolveCampaignTheme(campaign.linkedDonationPurpose, campaign.title);
  const heroImageUrl = resolveCampaignHeroImage(banner?.imageUrl, theme);

  const goal = Number(campaign.goalAmount ?? 0);
  const description = campaign.description?.trim() || null;
  const daysLeft = computeDaysLeftInTimeZone(campaign.campaignEndDate, tenant.timezone);
  const shareUrl = buildDonationLink(tenant, campaign);

  return (
    <div>
      {preview && (
        <div className="flex items-start gap-2.5 bg-foreground px-5 py-3 text-background md:px-6">
          <Eye className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            <span className="font-medium">Admin preview.</span>{" "}
            {previewBlockedReason
              ? PREVIEW_NOTICE[previewBlockedReason]
              : "This is exactly what visitors see — the campaign is live."}
          </p>
        </div>
      )}

      <DonateHero
        templeName={tenant.name}
        campaignTitle={campaign.title}
        subtitle={buildSubtitle(description)}
        heroImageUrl={heroImageUrl}
        heroImageIsUploaded={Boolean(banner?.imageUrl)}
        theme={theme}
        raisedAmount={summary.totalAmount}
        goalAmount={goal}
        donorCount={summary.donorCount}
        daysLeft={daysLeft}
        shareUrl={shareUrl}
      />

      {/*
        Story first, ask second — on mobile the single column runs
        story → impact → gallery → donation form, so a devotee arriving from
        WhatsApp understands the campaign before being asked for money. From
        `lg` up the ask moves into a sticky sidebar that stays with them as
        they read, which is the desktop equivalent of the mobile sticky bar.
      */}
      <div className="mx-auto mt-10 max-w-[1180px] px-5 md:px-6 lg:mt-14 lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-4">
          {description && <DonateStory imageUrl={banner?.imageUrl ?? null} description={description} />}
          <DonateImpact theme={theme} />
          {gallery.length > 0 && (
            <DonateGallery
              images={gallery.map((image) => ({
                id: image.id,
                imageUrl: image.imageUrl,
                title: image.title,
                width: image.width,
                height: image.height,
              }))}
            />
          )}
        </div>

        <aside className="mt-8 lg:sticky lg:top-6 lg:mt-0">
          {account ? (
            <>
              <DonationCheckoutForm
                tenantSlug={tenantSlug}
                campaignSlug={campaignSlug}
                token={token}
                templeName={tenant.name}
                upi={
                  account.providerKey === "upi_manual" && account.upiVpa && account.payeeName
                    ? { vpa: account.upiVpa, payeeName: account.payeeName, qrCodeUrl: account.qrCodeUrl }
                    : null
                }
              />
              <div className="mt-6">
                <DonateTrust providerKey={account.providerKey} />
              </div>
            </>
          ) : (
            // account is null only in admin preview — a visitor never reaches
            // an available page without a usable payment account.
            <div id="donate" className="rounded-[24px] border border-dashed p-5 text-center">
              <p className="font-medium">Donation form hidden in preview</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Connect a payment method in Settings → Payments to let visitors donate. Everything else on this page is
                exactly what they will see.
              </p>
            </div>
          )}
        </aside>
      </div>

      <div className="mt-12 lg:mt-16">
        <DonateStats
          raisedAmount={summary.totalAmount}
          goalAmount={goal}
          donorCount={summary.donorCount}
          daysLeft={daysLeft}
          lastDonationAt={summary.lastDonationAt}
          accent={theme.accent}
        />
      </div>

      <DonateTrustCards providerKey={account?.providerKey ?? "upi_manual"} />

      <DonateCta campaignTitle={campaign.title} shareUrl={shareUrl} />

      <DonateFooter
        templeName={tenant.name}
        contactEmail={tenant.contactEmail}
        contactPhone={tenant.defaultContactPhone}
        address={tenant.address}
        socialLinks={socialLinks}
      />

      {/* Padding so the fixed mobile bar never covers the footer's last line. */}
      <div className="h-20 lg:hidden" aria-hidden="true" />
      <DonateStickyBar raisedAmount={summary.totalAmount} goalAmount={goal} accent={theme.accent} />
    </div>
  );
}
