import { Building2, Flame, GraduationCap, HandHeart, Sparkles, Sprout, Stethoscope, UtensilsCrossed } from "lucide-react";
import type { CampaignThemeIcon } from "@/lib/campaigns/campaign-theme";
import { cn } from "@/lib/utils";

/**
 * The registry stores an icon *name* so it stays a plain serializable object
 * that can cross the server/client boundary; this is the one place that maps
 * those names to components.
 */
const ICONS: Record<CampaignThemeIcon, typeof Building2> = {
  Building2,
  UtensilsCrossed,
  Sprout,
  Sparkles,
  Flame,
  GraduationCap,
  Stethoscope,
  HandHeart,
};

export function CampaignThemeIconGlyph({ icon, className }: { icon: CampaignThemeIcon; className?: string }) {
  const Glyph = ICONS[icon];
  return <Glyph className={cn("size-5", className)} aria-hidden="true" />;
}
