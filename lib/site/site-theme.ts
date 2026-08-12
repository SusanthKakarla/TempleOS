import type { WebsiteHeroTemplate, WebsiteTheme } from "@/types/db";

/**
 * Presentation-only registries. Every temple's site is the same code reading
 * the same tenant data; these tables are the entire difference between one
 * temple's site and another's, so adding a look is a row here rather than a
 * component per temple.
 */

export interface SiteThemeTokens {
  /** Deep background the hero sits on. */
  base: string;
  /** Accent used for CTAs, rules and icon chips. */
  accent: string;
  /** Lighter accent for glows and hairlines. */
  accentSoft: string;
  /** Page background away from the hero. */
  surface: string;
  /** Body text on `surface`. */
  ink: string;
  /** Muted body text on `surface`. */
  inkMuted: string;
}

export const SITE_THEMES: Record<WebsiteTheme, SiteThemeTokens> = {
  saffron: { base: "#3E2723", accent: "#D98200", accentSoft: "#F0B858", surface: "#FFF8E7", ink: "#2F211B", inkMuted: "#6B5B4F" },
  maroon: { base: "#2E0C13", accent: "#B3123B", accentSoft: "#E8748F", surface: "#FFF4F2", ink: "#2B141A", inkMuted: "#6E5058" },
  gold: { base: "#33280F", accent: "#B08409", accentSoft: "#E4C56A", surface: "#FFFBEC", ink: "#2C2513", inkMuted: "#6B6046" },
  emerald: { base: "#0E2B22", accent: "#0F7B5A", accentSoft: "#6FCFAA", surface: "#F2FBF7", ink: "#152C25", inkMuted: "#4E6B61" },
  indigo: { base: "#141A34", accent: "#3B4CC0", accentSoft: "#93A0EE", surface: "#F5F6FF", ink: "#1B2038", inkMuted: "#565D80" },
};

export interface HeroTemplateSpec {
  label: string;
  /** Where the deity portrait sits relative to the copy. */
  layout: "split" | "centered" | "stacked";
  /** How the deity image is presented. */
  deityTreatment: "framed" | "bare" | "medallion" | "none";
  /** Backdrop treatment behind everything. */
  backdrop: "parallax-blur" | "solid" | "gradient";
  /** Decorative motion, all of which is skipped under prefers-reduced-motion. */
  embers: boolean;
  /** Hero height. */
  height: "tall" | "medium" | "compact";
}

/**
 * The template catalog. `classic` mirrors the reference site's composition —
 * blurred parallax backdrop, embers, and the deity in a gold frame beside the
 * copy — and the rest are variations on the same parts, never separate
 * components.
 */
export const HERO_TEMPLATES: Record<WebsiteHeroTemplate, HeroTemplateSpec> = {
  classic: { label: "Temple Classic", layout: "split", deityTreatment: "framed", backdrop: "parallax-blur", embers: true, height: "tall" },
  divine: { label: "Divine Gold", layout: "centered", deityTreatment: "medallion", backdrop: "parallax-blur", embers: true, height: "tall" },
  heritage: { label: "Heritage", layout: "split", deityTreatment: "framed", backdrop: "gradient", embers: false, height: "medium" },
  festival: { label: "Festival", layout: "stacked", deityTreatment: "bare", backdrop: "parallax-blur", embers: true, height: "tall" },
  minimal: { label: "Minimal", layout: "centered", deityTreatment: "none", backdrop: "solid", embers: false, height: "compact" },
  immersive: { label: "Modern Temple", layout: "stacked", deityTreatment: "bare", backdrop: "parallax-blur", embers: false, height: "tall" },
};

/**
 * A template that asks for a deity portrait can only use one if the temple
 * actually uploaded it. Rather than showing an empty frame, the hero falls
 * back to the copy-only composition — the same "empty hides the section" rule
 * the content adapter follows.
 */
export function resolveDeityTreatment(
  template: WebsiteHeroTemplate,
  hasDeityImage: boolean,
): HeroTemplateSpec["deityTreatment"] {
  const spec = HERO_TEMPLATES[template];
  return hasDeityImage ? spec.deityTreatment : "none";
}
