/**
 * Default campaign banner for temples that haven't uploaded one — built
 * entirely from layered CSS (`<div>`s + gradients + `clip-path`), no `<svg>`
 * and no data-URI images: gradients, a soft golden-hour glow, a faint
 * repeating-conic light-ray fan, a low-opacity grid of real `ॐ` text glyphs,
 * and one soft/blurred temple silhouette anchored to the bottom edge. Pure
 * decoration, `aria-hidden` — no text/logos/deities/people.
 */

const OM_GLYPHS = [
  { top: "12%", left: "10%", size: 34, rotate: -8, opacity: 0.07 },
  { top: "22%", left: "78%", size: 44, rotate: 6, opacity: 0.06 },
  { top: "48%", left: "28%", size: 30, rotate: 4, opacity: 0.07 },
  { top: "58%", left: "62%", size: 38, rotate: -5, opacity: 0.06 },
  { top: "8%", left: "48%", size: 26, rotate: 10, opacity: 0.08 },
  { top: "68%", left: "12%", size: 28, rotate: -3, opacity: 0.06 },
  { top: "35%", left: "90%", size: 24, rotate: 8, opacity: 0.07 },
  { top: "5%", left: "85%", size: 20, rotate: -6, opacity: 0.06 },
];

export function DonateBannerFallback({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <div
        className="relative size-full"
        style={{
          background: "linear-gradient(155deg, #FDECD3 0%, #F8C978 38%, #F0A23E 68%, #E8730F 100%)",
        }}
      >
        {/* soft golden-hour glow */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse 55% 45% at 50% 32%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 70%)",
          }}
        />

        {/* faint light-ray fan */}
        <div
          className="absolute inset-0 opacity-25"
          style={{
            background:
              "repeating-conic-gradient(from 0deg at 50% 30%, rgba(255,255,255,0.35) 0deg 4deg, transparent 4deg 16deg)",
            WebkitMaskImage: "radial-gradient(ellipse 60% 55% at 50% 30%, black 0%, transparent 75%)",
            maskImage: "radial-gradient(ellipse 60% 55% at 50% 30%, black 0%, transparent 75%)",
          }}
        />

        {/* low-opacity Om motif */}
        {OM_GLYPHS.map((glyph, i) => (
          <span
            key={i}
            className="absolute font-heading text-[#7A3A0B] select-none"
            style={{
              top: glyph.top,
              left: glyph.left,
              fontSize: glyph.size,
              opacity: glyph.opacity,
              transform: `rotate(${glyph.rotate}deg)`,
            }}
          >
            ॐ
          </span>
        ))}

        {/* soft blurred temple silhouette, bottom edge only */}
        <div
          className="absolute inset-x-0 bottom-0 h-[38%] blur-[2px]"
          style={{
            background: "#6B3410",
            opacity: 0.16,
            clipPath:
              "polygon(0% 100%, 0% 70%, 8% 70%, 8% 55%, 16% 55%, 16% 68%, 30% 68%, 30% 40%, 38% 20%, 46% 40%, 46% 68%, 62% 68%, 62% 50%, 70% 50%, 70% 68%, 84% 68%, 84% 58%, 92% 58%, 92% 70%, 100% 70%, 100% 100%)",
          }}
        />
      </div>
    </div>
  );
}
