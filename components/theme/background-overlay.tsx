/**
 * The scrim between a themed background photo and page content (Step 4/10 of
 * the EL10 visual-theme spec: gradient + opacity + brightness/contrast
 * adjustment, auto-scaled by how bright the source photo is, so brighter art
 * always gets a stronger scrim and darker art is left more visible — never a
 * fixed strength regardless of the image underneath).
 */
export function BackgroundOverlay({ brightness }: { brightness: number }) {
  // 0-255 -> ~0.39-0.75. Brighter source art needs a stronger scrim to stay
  // unobtrusive; darker art (already low-contrast) can show through more.
  const strength = Math.min(0.85, Math.max(0.35, 0.35 + (brightness / 255) * 0.5));

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        background: `linear-gradient(to bottom, color-mix(in oklch, var(--background) ${Math.round((strength - 0.15) * 100)}%, transparent) 0%, color-mix(in oklch, var(--background) ${Math.round(strength * 100)}%, transparent) 55%, color-mix(in oklch, var(--background) ${Math.round(Math.min(0.95, strength + 0.2) * 100)}%, transparent) 100%)`,
        backdropFilter: "blur(1px)",
      }}
    />
  );
}
