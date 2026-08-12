import { Heart } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { SITE_THEMES } from "@/lib/site/site-theme";
import { formatInr } from "@/lib/currency";
import type { SiteCampaign } from "@/lib/site/site-data";
import type { TempleSiteContent } from "@/lib/site/temple-content";

/**
 * The temple's live donation campaigns.
 *
 * Every "Donate" button is an ordinary link to the campaign's existing
 * checkout page — the same `/donate/{tenant}/{campaign}/{token}` URL the
 * temple already shares over WhatsApp. No payment code, no form and no new
 * flow lives here; this section is a shop window onto the donation system
 * that already exists.
 *
 * Progress is shown only because every campaign reaching this component has a
 * goal and a purpose tag (enforced by listSiteCampaigns), so a bar can never
 * sit at a meaningless zero.
 */
export async function SiteCampaigns({
  campaigns,
  content,
}: {
  campaigns: SiteCampaign[];
  content: TempleSiteContent;
}) {
  const theme = SITE_THEMES[content.hero.theme];
  const t = await getTranslations("site.donations");

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {campaigns.map((campaign) => {
        const raised = Math.max(0, campaign.raisedAmount);
        // Capped for the bar's width only — the figures above it stay truthful
        // when a temple raises more than it asked for.
        const percent = Math.min(100, Math.round((raised / campaign.goalAmount) * 100));

        return (
          <article
            key={campaign.id}
            className="site-lift flex h-full flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm"
          >
            {campaign.imageUrl && (
              <div className="overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
                <img
                  src={campaign.imageUrl}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="aspect-[16/9] w-full object-cover"
                />
              </div>
            )}

            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-heading text-lg" style={{ color: theme.ink }}>
                {campaign.title}
              </h3>
              {campaign.description && (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed" style={{ color: theme.inkMuted }}>
                  {campaign.description}
                </p>
              )}

              <div className="mt-5">
                <div
                  className="h-2 overflow-hidden rounded-full"
                  style={{ backgroundColor: `${theme.accent}1A` }}
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("progressLabel", { title: campaign.title, percent })}
                >
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${percent}%`, backgroundColor: theme.accent }}
                  />
                </div>
                <p className="mt-2.5 text-sm" style={{ color: theme.inkMuted }}>
                  {t.rich("progress", {
                    raised: formatInr(raised),
                    goal: formatInr(campaign.goalAmount),
                    // The raised figure stays emphasised in both languages,
                    // which a plain interpolation could not do without
                    // assuming English word order.
                    b: (chunks) => (
                      <span className="font-semibold" style={{ color: theme.ink }}>
                        {chunks}
                      </span>
                    ),
                  })}
                </p>
              </div>

              <a
                href={campaign.donateUrl}
                className="mt-6 flex items-center justify-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:outline-none motion-reduce:hover:translate-y-0"
                style={{ backgroundColor: theme.accent }}
              >
                <Heart className="size-4" aria-hidden="true" />
                {t("donate")}
                <span className="sr-only"> {t("donateTo", { title: campaign.title })}</span>
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
