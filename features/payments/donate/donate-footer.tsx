import Link from "next/link";
import Image from "next/image";
import { Globe, Link as LinkIcon, Mail, MapPin, Phone } from "lucide-react";
import type { SocialPlatform, TempleSocialLink } from "@/types/db";

interface DonateFooterProps {
  templeName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  socialLinks: TempleSocialLink[];
}

// lucide-react no longer ships trademarked brand/logo icons (see
// features/chatbot-settings/social-links-form.tsx for the same convention),
// so every platform gets a generic link/globe glyph instead of its logo.
const SOCIAL_ICON: Record<SocialPlatform, typeof Globe> = {
  facebook: LinkIcon,
  instagram: LinkIcon,
  youtube: LinkIcon,
  twitter: LinkIcon,
  website: Globe,
  other: LinkIcon,
};

const QUICK_LINKS = [
  { href: "#why-donation-matters", label: "Why It Matters" },
  { href: "#donate", label: "Donate Now" },
  { href: "#contribution-supports", label: "What You Support" },
];

/** Expanded, dark-brown premium footer — temple identity + real contact/social data already on the tenant record (no new fetch beyond the one-time `listSocialLinks` call in page.tsx), the two real legal pages this app already has, and in-page quick links. Still no marketing chrome (this page must only carry the temple's own branding, see (donate)/layout.tsx's doc comment). */
export function DonateFooter({ templeName, contactEmail, contactPhone, address, socialLinks }: DonateFooterProps) {
  return (
    <footer className="mt-16 bg-[#3E2723] px-5 py-12 text-[#FFF8E7]/70">
      <div className="mx-auto max-w-[760px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Image src="/donate-om-medallion.png" alt="" width={56} height={56} className="size-14 opacity-90" />
          <p className="font-heading text-lg text-[#FFF8E7]">{templeName}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-8 border-t border-white/10 pt-8 text-center sm:grid-cols-3 sm:text-left">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.15em] text-[#D4AF37] uppercase">Quick Links</p>
            <ul className="space-y-1.5 text-sm">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="hover:text-[#D4AF37] hover:underline">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.15em] text-[#D4AF37] uppercase">Contact</p>
            <ul className="space-y-1.5 text-sm">
              {contactPhone && (
                <li className="flex items-center justify-center gap-1.5 sm:justify-start">
                  <Phone className="size-3.5 shrink-0" />
                  {contactPhone}
                </li>
              )}
              {contactEmail && (
                <li className="flex items-center justify-center gap-1.5 sm:justify-start">
                  <Mail className="size-3.5 shrink-0" />
                  {contactEmail}
                </li>
              )}
              {address && (
                <li className="flex items-center justify-center gap-1.5 sm:justify-start">
                  <MapPin className="size-3.5 shrink-0" />
                  {address}
                </li>
              )}
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-[0.15em] text-[#D4AF37] uppercase">Legal</p>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link href="/privacy-policy" className="hover:text-[#D4AF37] hover:underline">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="hover:text-[#D4AF37] hover:underline">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/donation-refund-policy" className="hover:text-[#D4AF37] hover:underline">
                  Donation & Refund Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {socialLinks.length > 0 && (
          <div className="mt-8 flex justify-center gap-4 border-t border-white/10 pt-8 sm:justify-start">
            {socialLinks.map((link) => {
              const Icon = SOCIAL_ICON[link.platform];
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex size-9 items-center justify-center rounded-full border border-white/15 text-[#FFF8E7]/70 hover:border-[#D4AF37] hover:text-[#D4AF37]"
                  aria-label={link.platform}
                >
                  <Icon className="size-4" />
                </a>
              );
            })}
          </div>
        )}

        <p className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-[#FFF8E7]/50">Powered by TempleOS</p>
      </div>
    </footer>
  );
}
