/**
 * One themeKey per major feature/module (see docs/theme-mapping.md for the
 * full feature -> artwork -> reason table). Some features intentionally
 * share a themeKey (e.g. "whatsapp"/"settings"/"auditLogs" all reuse the
 * same neutral identity) — that's a deliberate reuse, not a gap.
 */
export type ThemeKey =
  | "landing"
  | "login"
  | "auth"
  | "dashboard"
  | "superAdmin"
  | "tenantDashboard"
  | "devotees"
  | "family"
  | "donations"
  | "campaigns"
  | "events"
  | "festivals"
  | "whatsapp"
  | "analytics"
  | "reports"
  | "settings"
  | "notifications"
  | "volunteer"
  | "inventory"
  | "bookings"
  | "mediaGallery"
  | "auditLogs"
  | "system"
  | "notFound"
  | "emptyState";

export interface ThemeDefinition {
  /** File name (without extension) under assets/themes/backgrounds/*.webp and assets/themes/source/*.png. */
  asset: string;
  /** Inlined tiny blurred placeholder, shown instantly while the real WebP loads. */
  blurDataURL: string;
  /** Native crop resolution — never upscaled, so `next/image` doesn't fabricate detail. */
  width: number;
  height: number;
  /** 0-255 average pixel lightness of the source crop, used to auto-scale overlay strength (Step 10: brighter art needs a stronger scrim to stay unobtrusive; darker art needs less). */
  brightness: number;
  /** CSS object-position, so the temple structure/focal subject stays in frame at every breakpoint instead of being center-cropped away. */
  focalPosition: string;
  /** Display label + one-line rationale, used in the generated theme-mapping report and any future admin-facing theme picker. */
  label: string;
  reason: string;
}
