import type { Metadata } from "next";
import { Eye, SearchX } from "lucide-react";
import { resolveDonationCheckoutAvailability, type DonationBlockedReason } from "@/lib/payments/donation-checkout-service";
import { getNotificationMediaById } from "@/lib/db/notification-media";
import { listCampaignGallery } from "@/lib/db/campaign-media";
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
import { DonateCta } from "@/features/payments/donate/donate-cta";
import { DonateFooter } from "@/features/payments/donate/donate-footer";

interface PageParams {
  params: Promise<{ tenantSlug: string; campaignSlug: string; token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * The only state that hides the whole page — anti-enumeration. Every other
 * reason (not started / ended / paused / payments off / goal reached) still
 * renders the campaign and swaps the form for an inline explanation, so a
 * devotee who follows a WhatsApp link always sees the temple's campaign.
 */
const NOT_FOUND_COPY = {
  icon: <SearchX className="size-6" />,
  title: "This donation link isn't available",
  description: "It may be incorrect, or the campaign may no longer exist. Please contact the temple directly.",
};

/** What the admin is told the public currently sees, per blocked reason. */
const PREVIEW_NOTICE: Record<DonationBlockedReason, string> = {
  not_started: "Visitors see \"opens soon\" until the start date arrives.",
  expired: "Visitors see \"campaign ended\" — the end date has passed.",
  disabled: "Visitors can't donate — this campaign is paused, archived, or cancelled.",
  payment_not_configured: "Visitors can't donate yet — online payments aren't enabled for this temple.",
  goal_reached: "Visitors see the goal as reached — no new donations are accepted.",
};

const SUBTITLE_MAX_LENGTH = 120;

/**
 * The gallery is optional decoration; the donation form is the point of the
 * page. A failure to read it (most plausibly this deployment running ahead of
 * migrations/040) must never take down a page devotees reach from a WhatsApp
 * link and are trying to give money through — so it degrades to "no gallery"
 * and shouts in the server log rather than throwing.
 */
async function loadGallerySafely(tenantId: string, campaignId: string) {
  try {
    return await listCampaignGallery(tenantId, campaignId);
  } catch (err) {
    console.error("[donate-page] campaign gallery unavailable, rendering without it", {
      campaignId,
      message: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}

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
  // Resolved in preview mode purely to describe the campaign, never to grant
  // anything: whoever is unfurling this link already holds the unguessable
  // donation token, which is itself proof the campaign is real. The identity
  // checks (tenant, campaign, token) still apply, so a wrong link falls
  // through to the generic title below. Without this, a campaign that is
  // merely paused, not yet started, or waiting on payment setup would unfurl
  // in WhatsApp as the generic TempleOS dashboard card instead of the
  // temple's own campaign — which is the whole point of these tags.
  const availability = await resolveDonationCheckoutAvailability(tenantSlug, campaignSlug, token, { preview: true });
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
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4">
        <EmptyState icon={NOT_FOUND_COPY.icon} title={NOT_FOUND_COPY.title} description={NOT_FOUND_COPY.description} />
      </div>
    );
  }

  const { canDonate, blockedReason } = availability;
  const { tenant, campaign, account, summary } = availability.context;
  const [banner, gallery] = await Promise.all([
    campaign.bannerMediaId ? getNotificationMediaById(tenant.id, campaign.bannerMediaId) : Promise.resolve(null),
    loadGallerySafely(tenant.id, campaign.id),
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
            {blockedReason
              ? PREVIEW_NOTICE[blockedReason]
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
        canDonate={canDonate}
        blockedReason={blockedReason}
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
                canDonate={canDonate}
                blockedReason={blockedReason}
                campaignTitle={campaign.title}
                shareUrl={shareUrl}
              />
              <div className="mt-6">
                <DonateTrust providerKey={account?.providerKey ?? null} />
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

      <DonateFooter templeName={tenant.name} contactPhone={tenant.defaultContactPhone} />

    </div>
  );
}
