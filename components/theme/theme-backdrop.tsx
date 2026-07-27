import Image from "next/image";
import goldenSunriseHero from "@/assets/themes/backgrounds/golden-sunrise-hero.webp";
import creamBellsTemple from "@/assets/themes/backgrounds/cream-bells-temple.webp";
import oliveDuskTemple from "@/assets/themes/backgrounds/olive-dusk-temple.webp";
import navyNightTemple from "@/assets/themes/backgrounds/navy-night-temple.webp";
import rustOrangeTemple from "@/assets/themes/backgrounds/rust-orange-temple.webp";
import forestMandalaTemple from "@/assets/themes/backgrounds/forest-mandala-temple.webp";
import goldenRiversideTemple from "@/assets/themes/backgrounds/golden-riverside-temple.webp";
import maroonLampTemple from "@/assets/themes/backgrounds/maroon-lamp-temple.webp";
import creamLeavesTemple from "@/assets/themes/backgrounds/cream-leaves-temple.webp";
import navyStarsTemple from "@/assets/themes/backgrounds/navy-stars-temple.webp";
import goldenBellPillarTemple from "@/assets/themes/backgrounds/golden-bell-pillar-temple.webp";
import tealLotusTemple from "@/assets/themes/backgrounds/teal-lotus-temple.webp";
import orangeSilkTemple from "@/assets/themes/backgrounds/orange-silk-temple.webp";
import blueMountainBirdsTemple from "@/assets/themes/backgrounds/blue-mountain-birds-temple.webp";
import darkPillarsLampsTemple from "@/assets/themes/backgrounds/dark-pillars-lamps-temple.webp";
import mistyMountainLandscapeTemple from "@/assets/themes/backgrounds/misty-mountain-landscape-temple.webp";
import deepBlueGoldTemple from "@/assets/themes/backgrounds/deep-blue-gold-temple.webp";
import { getTheme } from "@/lib/themes/registry";
import type { ThemeKey } from "@/lib/themes/types";
import { BackgroundOverlay } from "./background-overlay";

/** Every background asset, statically imported once (Next.js needs the literal import to inline width/height/optimize at build time) and looked up by name. This is the ONLY file in the app that imports theme background images directly. */
const ASSET_IMAGES = {
  "golden-sunrise-hero": goldenSunriseHero,
  "cream-bells-temple": creamBellsTemple,
  "olive-dusk-temple": oliveDuskTemple,
  "navy-night-temple": navyNightTemple,
  "rust-orange-temple": rustOrangeTemple,
  "forest-mandala-temple": forestMandalaTemple,
  "golden-riverside-temple": goldenRiversideTemple,
  "maroon-lamp-temple": maroonLampTemple,
  "cream-leaves-temple": creamLeavesTemple,
  "navy-stars-temple": navyStarsTemple,
  "golden-bell-pillar-temple": goldenBellPillarTemple,
  "teal-lotus-temple": tealLotusTemple,
  "orange-silk-temple": orangeSilkTemple,
  "blue-mountain-birds-temple": blueMountainBirdsTemple,
  "dark-pillars-lamps-temple": darkPillarsLampsTemple,
  "misty-mountain-landscape-temple": mistyMountainLandscapeTemple,
  "deep-blue-gold-temple": deepBlueGoldTemple,
} as const;

/**
 * The actual background renderer — one `<Image>` (lazy, blur-up, responsive)
 * plus its brightness-scaled overlay. Server-safe (no hooks), so it can be
 * rendered directly by static single-theme surfaces (login, the Super Admin
 * shell) or by <BackgroundManager> for pages whose theme changes per-route.
 * Nothing else in the app imports background images directly — this is the
 * one place that does, per the spec's "no page manually imports images" rule.
 */
export function ThemeBackdrop({ themeKey }: { themeKey: ThemeKey }) {
  const theme = getTheme(themeKey);
  const image = ASSET_IMAGES[theme.asset as keyof typeof ASSET_IMAGES];

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <Image
        src={image}
        alt=""
        fill
        priority={false}
        placeholder="blur"
        blurDataURL={theme.blurDataURL}
        sizes="100vw"
        className="object-cover transition-opacity duration-300"
        style={{ objectPosition: theme.focalPosition }}
      />
      <BackgroundOverlay brightness={theme.brightness} />
    </div>
  );
}
