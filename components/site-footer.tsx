import Link from "next/link";
import { Landmark, Mail } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const productItems = ["Devotee Registration", "Seva Bookings", "Donations", "WhatsApp Announcements"];

const legalLinks = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
];

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2 font-heading text-base font-semibold">
              <span className="gradient-saffron-gold flex size-7 items-center justify-center rounded-lg text-saffron-foreground">
                <Landmark className="size-4" aria-hidden="true" />
              </span>
              TempleOS
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              Temple management software for devotee records, seva bookings, donations, and WhatsApp
              communication.
            </p>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold">Platform</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {productItems.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-heading text-sm font-semibold">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <a
              href="mailto:privacy@trytempleos.com"
              className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Mail className="size-3.5" aria-hidden="true" />
              privacy@trytempleos.com
            </a>
          </div>
        </div>

        <Separator className="my-8" />

        <p className="text-xs text-muted-foreground">© {year} TempleOS. All rights reserved.</p>
      </div>
    </footer>
  );
}
