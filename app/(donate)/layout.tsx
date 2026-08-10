import { Poppins, Inter } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-donate-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-donate-sans",
  display: "swap",
});

/**
 * Deliberately minimal — this route group is reached from a WhatsApp
 * donation link and must show the TEMPLE's own branding (rendered by the
 * page itself), not TempleOS's marketing chrome (SiteHeader/SiteFooter,
 * used by the (marketing) group).
 *
 * Poppins/Inter + the warm gold/cream palette here are the premium
 * donation-page look (see features/payments/donate/*) — scoped to this
 * route group only via these CSS variables + `font-heading`/`font-sans`
 * overrides below, not the app's global theme (which stays Playfair/Noto
 * Sans everywhere else). Also reaches the PhonePe `/return` completion page
 * without that page needing its own styling.
 */
export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${poppins.variable} ${inter.variable} min-h-screen bg-[#FFF8E8] text-[#2F211B] [--font-heading:var(--font-donate-heading)] [--font-sans:var(--font-donate-sans)]`}
    >
      {children}
    </div>
  );
}
