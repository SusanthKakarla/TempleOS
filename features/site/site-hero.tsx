import Image from "next/image";
import Link from "next/link";
import { HERO_TEMPLATES, resolveDeityTreatment, SITE_THEMES } from "@/lib/site/site-theme";
import type { TempleSiteContent } from "@/lib/site/temple-content";
import { DeityFrame } from "./deity-frame";
import { Embers, HeroParallax } from "./hero-backdrop";

const HEIGHTS = {
  tall: "min-h-[max(38rem,88svh)]",
  medium: "min-h-[32rem]",
  compact: "min-h-[24rem]",
} as const;

/**
 * The temple's hero, composed from the template chosen in its website config.
 *
 * There is one hero component for every temple and every template — the
 * catalog in lib/site/site-theme.ts decides layout, deity treatment, backdrop
 * and motion, so a new look is a registry entry rather than another
 * component. The deity portrait is always the temple's own uploaded image,
 * and when it hasn't uploaded one the composition falls back to copy alone
 * instead of showing an empty frame.
 */
export function SiteHero({ content }: { content: TempleSiteContent }) {
  const spec = HERO_TEMPLATES[content.hero.template];
  const theme = SITE_THEMES[content.hero.theme];
  const treatment = resolveDeityTreatment(content.hero.template, Boolean(content.hero.deityImageUrl));
  // Narrowed to a value DeityFrame accepts, so "no portrait uploaded" is a
  // single null rather than a magic string threaded through the markup.
  const deityTreatment = treatment === "none" ? null : treatment;
  const deityImage = deityTreatment ? content.hero.deityImageUrl : null;
  const centered = spec.layout === "centered" || !deityImage;

  return (
    <section
      className={`relative isolate flex ${HEIGHTS[spec.height]} items-center overflow-hidden`}
      style={{ backgroundColor: theme.base }}
    >
      {spec.backdrop === "parallax-blur" && content.hero.backdropImageUrl && (
        <div className="absolute inset-0 -z-30 overflow-hidden">
          <HeroParallax>
            {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
            <img
              src={content.hero.backdropImageUrl}
              alt=""
              className="size-full scale-[1.08] object-cover object-center blur-[6px]"
              aria-hidden="true"
            />
          </HeroParallax>
        </div>
      )}
      {spec.backdrop === "gradient" && (
        <div
          className="absolute inset-0 -z-30"
          style={{ background: `linear-gradient(160deg, ${theme.base}, ${theme.accent}33)` }}
          aria-hidden="true"
        />
      )}

      {/* Sanctum glow + vignette, so text stays legible on any uploaded photo. */}
      <div
        className="absolute inset-0 -z-20"
        style={{ background: `radial-gradient(60% 50% at 50% 40%, ${theme.accent}33, transparent 70%)` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/25 to-black/70" aria-hidden="true" />

      {spec.embers && <Embers accent={theme.accentSoft} />}

      <div className="relative mx-auto w-full max-w-6xl px-5 py-16 md:px-8">
        <div
          className={
            centered
              ? "mx-auto flex max-w-2xl flex-col items-center text-center"
              : "grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]"
          }
        >
          <div className={centered ? "" : spec.layout === "stacked" ? "order-2 text-center lg:text-left" : ""}>
            {content.hero.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL
              <img
                src={content.hero.logoUrl}
                alt={`${content.name} logo`}
                className={`mb-5 h-16 w-auto object-contain ${centered ? "mx-auto" : ""}`}
              />
            )}

            {content.deityName && (
              <p
                className="text-xs font-medium tracking-[0.3em] uppercase"
                style={{ color: theme.accentSoft }}
              >
                {content.deityName}
              </p>
            )}

            <h1 className="mt-3 font-heading text-3xl leading-[1.15] text-white sm:text-4xl md:text-5xl">
              {content.hero.title}
            </h1>

            {content.hero.subtitle && (
              <p className={`mt-4 max-w-xl text-sm text-white/85 sm:text-base ${centered ? "mx-auto" : ""}`}>
                {content.hero.subtitle}
              </p>
            )}

            <div className={`mt-8 flex flex-wrap gap-3 ${centered ? "justify-center" : ""}`}>
              <Link
                href="/timings"
                className="rounded-full px-6 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                style={{ backgroundColor: theme.accent }}
              >
                Darshan timings
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                About the temple
              </Link>
            </div>
          </div>

          {deityTreatment && deityImage && (
            <div className={spec.layout === "stacked" ? "order-1 mx-auto w-full max-w-md" : "mx-auto w-full max-w-md"}>
              <DeityFrame
                src={deityImage}
                alt={content.deityName ? `${content.deityName} at ${content.name}` : content.name}
                accent={theme.accent}
                treatment={deityTreatment}
              />
            </div>
          )}
        </div>
      </div>

      {/* Decorative om medallion, reused from the donation pages' asset set. */}
      <Image
        src="/donate-om-medallion.png"
        alt=""
        width={420}
        height={420}
        className="pointer-events-none absolute -right-16 -bottom-16 size-64 opacity-[0.06] md:size-96"
        aria-hidden="true"
      />
    </section>
  );
}
