import type { TempleSiteContent } from "@/lib/site/temple-content";

const SIZES = {
  sm: "size-10",
  md: "size-12 md:size-14",
} as const;

/**
 * The temple's identity mark, always circular.
 *
 * Temples upload whatever they have — a rectangular banner, a square scan, a
 * transparent PNG — so the circle is imposed here rather than assumed of the
 * asset. `object-contain` inside a padded round container is deliberate: a
 * `cover` crop would slice the edges off a wide logo and behead a deity in a
 * portrait one. The uploaded file is never modified; only its presentation is.
 *
 * When a temple has uploaded no logo, its initial stands in on the accent
 * colour — the same circle, never an empty hole or a stock graphic.
 */
export function TempleLogo({
  content,
  accent,
  size = "sm",
  className = "",
}: {
  content: TempleSiteContent;
  accent: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const shell = `${SIZES[size]} relative shrink-0 rounded-full ${className}`;

  if (!content.hero.logoUrl) {
    return (
      <span
        className={`${shell} grid place-items-center font-heading text-lg font-semibold text-white ring-1 ring-white/25`}
        style={{ backgroundColor: accent, boxShadow: `0 8px 24px -8px ${accent}` }}
        aria-hidden="true"
      >
        {content.name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <span
      className={`${shell} grid place-items-center overflow-hidden bg-white/95 p-1.5 ring-1 ring-black/10`}
      style={{ boxShadow: `0 10px 30px -12px ${accent}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL, not a bundled asset */}
      <img
        src={content.hero.logoUrl}
        alt={`${content.name} logo`}
        className="size-full rounded-full object-contain"
      />
    </span>
  );
}
