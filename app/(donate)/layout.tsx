/**
 * Deliberately minimal — this route group is reached from a WhatsApp
 * donation link and must show the TEMPLE's own branding (rendered by the
 * page itself), not TempleOS's marketing chrome (SiteHeader/SiteFooter,
 * used by the (marketing) group).
 *
 * The warm cream background/text color here is the premium donation-page
 * palette (see features/payments/donate/*) — scoped to this route group
 * only, not the app's global theme, so it also reaches the PhonePe
 * `/return` completion page without that page needing its own styling.
 */
export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#FAF8F5] text-[#2B2B2B]">{children}</div>;
}
