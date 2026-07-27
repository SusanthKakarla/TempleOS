/**
 * Deliberately minimal — this route group is reached from a WhatsApp
 * donation link and must show the TEMPLE's own branding (rendered by the
 * page itself), not TempleOS's marketing chrome (SiteHeader/SiteFooter,
 * used by the (marketing) group).
 */
export default function DonateLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-muted/20">{children}</div>;
}
