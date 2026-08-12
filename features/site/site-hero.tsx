import { ArrowDown } from "lucide-react";
import { HERO_TEMPLATES, resolveDeityTreatment, SITE_THEMES } from "@/lib/site/site-theme";
import { SITE_SECTIONS } from "@/lib/site/site-anchors";
import type { TempleSiteContent } from "@/lib/site/temple-content";
import { DeityFrame } from "./deity-frame";
import { Embers, HeroParallax, LightRays, Mandala, TempleSilhouette } from "./hero-backdrop";
import { TempleLogo } from "./temple-logo";

const HEIGHTS = {
  tall: "min-h-[max(40rem,92svh)]",
  medium: "min-h-[34rem]",
  compact: "min-h-[26rem]",
} as const;

/**
 * The temple's hero — the digital entrance to the temple.
 *
 * Composed from the template chosen in its website config: the catalog in
 * lib/site/site-theme.ts decides layout, deity treatment, backdrop and motion,
 * so a new look is a registry entry rather than another component.
 *
 * The environment is built in layers at increasing depth — backdrop, light
 * rays, gopuram silhouette, mandala, then the deity portrait in its frame —
 * because the previous single-image-on-a-flat-panel composition read as a
 * stock photo dropped into a box. Every layer except the portrait is drawn
 * from the temple's own accent colour rather than fetched, so a temple that
 * has uploaded only a deity photograph still gets a temple, and no temple ever
 * shows another temple's architecture.
 *
 * The deity portrait is always the temple's own uploaded image, unmodified.
 * When none has been uploaded the composition centres on the copy instead of
 * showing an empty frame.
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
      id={SITE_SECTIONS.home}
      tabIndex={-1}
      className={`site-section relative isolate flex ${HEIGHTS[spec.height]} items-center overflow-hidden`}
      style={{ backgroundColor: theme.base }}
    >
      {spec.backdrop === "parallax-blur" && content.hero.backdropImageUrl && (
        <div className="absolute inset-0 -z-40 overflow-hidden">
          <HeroParallax depth={0.3} scale={1.12}>
            {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
            <img
              src={content.hero.backdropImageUrl}
              alt=""
              className="size-full object-cover object-center blur-[10px]"
              aria-hidden="true"
            />
          </HeroParallax>
        </div>
      )}
      {spec.backdrop === "gradient" && (
        <div
          className="absolute inset-0 -z-40"
          style={{ background: `linear-gradient(160deg, ${theme.base}, ${theme.accent}33)` }}
          aria-hidden="true"
        />
      )}

      {/* Sanctum glow, so text stays legible on any uploaded photo. */}
      <div
        className="absolute inset-0 -z-30"
        style={{ background: `radial-gradient(65% 55% at 50% 34%, ${theme.accent}3D, transparent 72%)` }}
        aria-hidden="true"
      />
      <LightRays color={`${theme.accentSoft}22`} />

      {/* Temple architecture, drifting a little slower than the page. */}
      <div className="absolute inset-0 -z-20 overflow-hidden">
        <HeroParallax depth={0.12} scale={1}>
          <TempleSilhouette color={theme.accentSoft} />
        </HeroParallax>
      </div>

      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-black/45 via-black/20 to-black/75" aria-hidden="true" />

      {spec.embers && <Embers accent={theme.accentSoft} />}

      <div className="relative mx-auto w-full max-w-6xl px-5 py-20 md:px-8">
        <div
          className={
            centered
              ? "mx-auto flex max-w-2xl flex-col items-center text-center"
              : "grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]"
          }
        >
          <div className={centered ? "" : "order-2 text-center lg:order-1 lg:text-left"}>
            <div className={`flex ${centered ? "justify-center" : "justify-center lg:justify-start"}`}>
              <TempleLogo content={content} accent={theme.accent} size="lg" />
            </div>

            {content.deityName && (
              <p className="mt-6 text-[0.7rem] font-medium tracking-[0.34em] uppercase" style={{ color: theme.accentSoft }}>
                {content.deityName}
              </p>
            )}

            <h1 className="mt-3 font-heading text-[clamp(2rem,7vw,3.75rem)] leading-[1.1] text-white">
              {content.hero.title}
            </h1>

            <p
              className={`mt-2 font-heading text-lg text-white/70 sm:text-xl ${centered ? "" : "lg:text-left"}`}
            >
              {content.name}
            </p>

            {content.hero.subtitle && (
              <p
                className={`mt-5 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base ${
                  centered ? "mx-auto" : "mx-auto lg:mx-0"
                }`}
              >
                {content.hero.subtitle}
              </p>
            )}

            <div
              className={`mt-9 flex flex-wrap gap-3 ${centered ? "justify-center" : "justify-center lg:justify-start"}`}
            >
              <a
                href={`#${SITE_SECTIONS.timings}`}
                className="rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none motion-reduce:hover:translate-y-0"
                style={{ backgroundColor: theme.accent, boxShadow: `0 18px 40px -18px ${theme.accent}` }}
              >
                Darshan timings
              </a>
              <a
                href={`#${SITE_SECTIONS.about}`}
                className="rounded-full border border-white/35 px-7 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
              >
                About the temple
              </a>
            </div>
          </div>

          {deityTreatment && deityImage && (
            <div className="order-1 mx-auto w-full max-w-[19rem] sm:max-w-sm lg:order-2 lg:max-w-md">
              <DeityFrame
                src={deityImage}
                alt={content.deityName ? `${content.deityName} at ${content.name}` : content.name}
                accent={theme.accent}
                accentSoft={theme.accentSoft}
                treatment={deityTreatment}
              />
            </div>
          )}
        </div>
      </div>

      {/* Centred mandala watermark for copy-only heroes, which would otherwise
          have nothing behind the text at all. */}
      {!deityImage && (
        <Mandala
          color={theme.accentSoft}
          className="pointer-events-none absolute top-1/2 left-1/2 size-[34rem] -translate-x-1/2 -translate-y-1/2 opacity-20"
        />
      )}

      <a
        href={`#${SITE_SECTIONS.about}`}
        className="absolute inset-x-0 bottom-6 mx-auto flex w-fit items-center gap-2 rounded-full px-4 py-2 text-[0.7rem] tracking-[0.2em] text-white/55 uppercase transition-colors hover:text-white focus-visible:ring-2 focus-visible:outline-none"
      >
        <ArrowDown className="site-nudge size-3.5" aria-hidden="true" />
        Explore
      </a>
    </section>
  );
}
