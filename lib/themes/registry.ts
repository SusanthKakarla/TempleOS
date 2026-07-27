import blurPlaceholders from "@/assets/themes/blur-placeholders.json";
import type { ThemeDefinition, ThemeKey } from "./types";

/** Measured once via sharp's stats() against each extracted crop (see scripts/extract-theme-artwork.mjs) — average 0-255 pixel lightness, drives the auto overlay-strength curve in background-overlay.tsx. */
const ASSET_BRIGHTNESS: Record<string, number> = {
  "cream-bells-temple": 206,
  "cream-leaves-temple": 187,
  "blue-mountain-birds-temple": 173,
  "teal-lotus-temple": 160,
  "golden-bell-pillar-temple": 141,
  "misty-mountain-landscape-temple": 126,
  "golden-riverside-temple": 115,
  "orange-silk-temple": 110,
  "golden-sunrise-hero": 108,
  "rust-orange-temple": 74,
  "olive-dusk-temple": 64,
  "navy-stars-temple": 35,
  "maroon-lamp-temple": 34,
  "forest-mandala-temple": 32,
  "navy-night-temple": 32,
  "deep-blue-gold-temple": 24,
  "dark-pillars-lamps-temple": 21,
};

/**
 * Curated per-feature assignment (Step 3/14 of the EL10 visual-theme spec).
 * `focalPosition` was set from visual inspection of each crop (where the
 * temple structure / main subject sits) so object-fit:cover never crops the
 * subject away at narrow viewports.
 */
const THEME_META: Record<ThemeKey, { asset: string; focalPosition: string; label: string; reason: string }> = {
  landing: { asset: "golden-sunrise-hero", focalPosition: "60% 55%", label: "Golden Sunrise Temple", reason: "Grand, aspirational first impression" },
  login: { asset: "navy-night-temple", focalPosition: "center 55%", label: "Dark Temple", reason: "Calm, focused, distraction-free entry point" },
  auth: { asset: "cream-bells-temple", focalPosition: "30% 70%", label: "Golden Minimal", reason: "Warm but unobtrusive during OTP entry" },
  dashboard: { asset: "teal-lotus-temple", focalPosition: "25% 55%", label: "Minimal Light Theme", reason: "Airy, everyday-use neutral" },
  superAdmin: { asset: "dark-pillars-lamps-temple", focalPosition: "30% 60%", label: "Dark Premium", reason: "Serious, elevated platform-operator context (substitute for \"Royal Purple\" — no purple artwork exists in the source collages)" },
  tenantDashboard: { asset: "golden-bell-pillar-temple", focalPosition: "70% 60%", label: "Elegant Golden Temple", reason: "Premium daily-use identity for temple admins" },
  devotees: { asset: "cream-leaves-temple", focalPosition: "30% 75%", label: "Cream Temple Background", reason: "Calm, personal, human-focused" },
  family: { asset: "olive-dusk-temple", focalPosition: "75% 80%", label: "Olive Theme", reason: "Grounded, familial warmth" },
  donations: { asset: "rust-orange-temple", focalPosition: "35% 75%", label: "Orange Temple Theme", reason: "Warmth and urgency for giving" },
  campaigns: { asset: "golden-riverside-temple", focalPosition: "40% 45%", label: "Golden Temple Sunset", reason: "Donation-campaign urgency, hopeful sunset mood" },
  events: { asset: "golden-sunrise-hero", focalPosition: "60% 55%", label: "Sunrise Temple", reason: "Shared sunrise identity with Landing — new beginnings" },
  festivals: { asset: "maroon-lamp-temple", focalPosition: "35% 55%", label: "Deep Maroon Temple", reason: "Festive, ceremonial intensity" },
  whatsapp: { asset: "teal-lotus-temple", focalPosition: "25% 55%", label: "Minimal Neutral", reason: "Utility-focused messaging context" },
  analytics: { asset: "deep-blue-gold-temple", focalPosition: "70% 75%", label: "Deep Blue Premium", reason: "Professional, data-focused" },
  reports: { asset: "cream-leaves-temple", focalPosition: "30% 75%", label: "Minimal Cream", reason: "Document-like calm" },
  settings: { asset: "teal-lotus-temple", focalPosition: "25% 55%", label: "Subtle Neutral", reason: "Low-distraction configuration context" },
  notifications: { asset: "navy-stars-temple", focalPosition: "center 70%", label: "Night Temple", reason: "Alerts arrive quietly, at night" },
  volunteer: { asset: "forest-mandala-temple", focalPosition: "center", label: "Green Temple", reason: "Community, growth, service" },
  inventory: { asset: "misty-mountain-landscape-temple", focalPosition: "60% 55%", label: "Stone Theme", reason: "Earthy, storage-oriented mood (substitute — no stone-toned artwork exists in the source collages)" },
  bookings: { asset: "golden-bell-pillar-temple", focalPosition: "70% 60%", label: "Golden Light", reason: "Shares Tenant Dashboard's golden identity" },
  mediaGallery: { asset: "blue-mountain-birds-temple", focalPosition: "65% 50%", label: "Art Gallery Theme", reason: "Scenic, artistic wide shot" },
  auditLogs: { asset: "teal-lotus-temple", focalPosition: "25% 55%", label: "Minimal Neutral", reason: "Neutral, record-keeping context" },
  system: { asset: "dark-pillars-lamps-temple", focalPosition: "30% 60%", label: "Dark Premium", reason: "Shares Super Admin's serious identity" },
  notFound: { asset: "navy-stars-temple", focalPosition: "center 70%", label: "Night Temple", reason: "Shares Notifications' quiet night identity" },
  emptyState: { asset: "cream-leaves-temple", focalPosition: "30% 75%", label: "Minimal Cream", reason: "Shares Devotees/Reports' calm identity" },
};

type BlurEntry = { width: number; height: number; blurDataURL: string };
const blurLookup = blurPlaceholders as unknown as Record<string, BlurEntry>;

/** "ThemeLoader" — resolves a themeKey to its full asset definition (path, dimensions, blur placeholder, brightness, focal point). The single place every layout/page reads from; nothing imports images directly. */
export function getTheme(key: ThemeKey): ThemeDefinition {
  const meta = THEME_META[key];
  const blur = blurLookup[meta.asset];
  if (!blur) {
    throw new Error(`Theme "${key}" references unknown asset "${meta.asset}" — regenerate assets/themes/blur-placeholders.json via scripts/extract-theme-artwork.mjs`);
  }
  return {
    asset: meta.asset,
    focalPosition: meta.focalPosition,
    label: meta.label,
    reason: meta.reason,
    width: blur.width,
    height: blur.height,
    blurDataURL: blur.blurDataURL,
    brightness: ASSET_BRIGHTNESS[meta.asset] ?? 128,
  };
}

export const THEME_KEYS = Object.keys(THEME_META) as ThemeKey[];
