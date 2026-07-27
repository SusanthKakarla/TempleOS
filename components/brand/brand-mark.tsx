import Image from "next/image";
import { brand } from "@/lib/brand/tokens";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  /** "icon" = emblem only (square, pair with text yourself); "full" = emblem + wordmark baked in. */
  variant?: "icon" | "full" | "icon-mono-black" | "icon-mono-white";
  /** Pixel height of the rendered mark; width follows the asset's own aspect ratio. */
  size?: number;
  className?: string;
}

const ASSET_BY_VARIANT = {
  icon: brand.logo.icon,
  full: brand.logo.full,
  "icon-mono-black": brand.logo.iconMonoBlack,
  "icon-mono-white": brand.logo.iconMonoWhite,
};

/** The one component that renders the approved TempleOS logo — never import a brand asset file directly elsewhere. */
export function BrandMark({ variant = "icon", size = 32, className }: BrandMarkProps) {
  const asset = ASSET_BY_VARIANT[variant];
  const width = Math.round((size * asset.width) / asset.height);
  return (
    <Image
      src={asset}
      alt={brand.name}
      height={size}
      width={width}
      className={cn("shrink-0 object-contain", className)}
      priority
    />
  );
}
