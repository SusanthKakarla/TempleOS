/**
 * Default campaign banner for temples that haven't uploaded one — a
 * hand-coded inline SVG, not a photo asset (none was available). Golden-hour
 * gradient, a simple low-detail temple silhouette, and a faint mandala
 * line-motif in one corner. Deliberately no text/logos/deities/people, per
 * the brief's explicit avoid-list — purely decorative, `aria-hidden`.
 */
export function DonateBannerFallback({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 800 320" preserveAspectRatio="xMidYMax slice" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="donate-fallback-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FBEFDD" />
          <stop offset="55%" stopColor="#F3DDB0" />
          <stop offset="100%" stopColor="#E8C787" />
        </linearGradient>
        <radialGradient id="donate-fallback-sun" cx="50%" cy="38%" r="30%">
          <stop offset="0%" stopColor="#FFF6E4" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#FFF6E4" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="800" height="320" fill="url(#donate-fallback-sky)" />
      <circle cx="400" cy="120" r="160" fill="url(#donate-fallback-sun)" />

      {/* faint mandala motif, top-right corner */}
      <g stroke="#8B4513" strokeOpacity="0.12" strokeWidth="1.5" fill="none">
        <circle cx="690" cy="70" r="46" />
        <circle cx="690" cy="70" r="30" />
        <circle cx="690" cy="70" r="14" />
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * Math.PI) / 6;
          const x2 = 690 + 46 * Math.cos(angle);
          const y2 = 70 + 46 * Math.sin(angle);
          return <line key={i} x1="690" y1="70" x2={x2} y2={y2} />;
        })}
      </g>

      {/* temple silhouette */}
      <g fill="#8B4513" fillOpacity="0.55">
        <rect x="0" y="255" width="800" height="65" />
        {/* central shikhara */}
        <path d="M400 130 L430 220 L370 220 Z" />
        <rect x="378" y="220" width="44" height="35" />
        <circle cx="400" cy="122" r="6" />
        {/* side pillars/domes */}
        <path d="M300 180 L322 220 L278 220 Z" />
        <rect x="284" y="220" width="32" height="35" />
        <path d="M500 180 L522 220 L478 220 Z" />
        <rect x="484" y="220" width="32" height="35" />
        <path d="M220 200 L236 220 L204 220 Z" />
        <rect x="208" y="220" width="24" height="35" />
        <path d="M580 200 L596 220 L564 220 Z" />
        <rect x="568" y="220" width="24" height="35" />
      </g>
    </svg>
  );
}
