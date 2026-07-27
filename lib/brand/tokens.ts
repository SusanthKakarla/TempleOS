import iconColor from "@/assets/brand/icon/templeos-icon.png";
import iconMonoBlack from "@/assets/brand/icon/templeos-icon-mono-black.png";
import iconMonoWhite from "@/assets/brand/icon/templeos-icon-mono-white.png";
import logoFull from "@/assets/brand/logo/templeos-logo-full.png";

/**
 * Design tokens for the approved TempleOS brand mark — every place branding
 * appears (sidebar, header, login, 404, future email/PDF templates) reads
 * from here instead of importing an image file or hardcoding a path
 * directly. Regenerate the underlying files with
 * `node scripts/generate-brand-assets.mjs` if the source logo ever changes;
 * nothing else needs to change.
 */
export const brand = {
  name: "TempleOS",
  logo: {
    /** Full mark: emblem + "TempleOS" wordmark. Use where there's room to breathe (login hero, marketing, print). */
    full: logoFull,
    /** Emblem only, no wordmark, square — the one to pair with a "TempleOS" text label (sidebar, header, favicons). */
    icon: iconColor,
    /** Single-color variants for contexts where the full-color mark would clash (e.g. a colored button, watermark). */
    iconMonoBlack,
    iconMonoWhite,
  },
  /** Minimum safe render size — below this the emblem's detail (individual leaves/figures) stops reading clearly. See docs/BRAND-GUIDELINES.md. */
  minSizePx: 24,
} as const;
