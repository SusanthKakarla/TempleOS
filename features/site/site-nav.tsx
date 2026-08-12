"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Site navigation. The link set is the same for every temple — the pages
 * themselves hide when a temple has no content for them, so the nav does not
 * need to know what each temple has filled in.
 *
 * A disclosure button rather than a slide-out drawer on small screens: the
 * whole site is a handful of pages, and a drawer would be more machinery than
 * the content warrants.
 */
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/timings", label: "Timings" },
  { href: "/sevas", label: "Sevas" },
  { href: "/events", label: "Events" },
  { href: "/gallery", label: "Gallery" },
  { href: "/slokas", label: "Slokas" },
  { href: "/contact", label: "Contact" },
];

export function SiteNav({ accent }: { accent: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <>
      <nav className="ml-auto hidden items-center gap-1 lg:flex" aria-label="Temple website">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-2 text-sm transition-colors hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none",
              isActive(link.href) ? "font-semibold" : "text-black/70",
            )}
            style={isActive(link.href) ? { color: accent } : undefined}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="site-mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className="ml-auto rounded-lg p-2 hover:bg-black/5 focus-visible:ring-2 focus-visible:outline-none lg:hidden"
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {open && (
        <nav
          id="site-mobile-nav"
          aria-label="Temple website"
          className="absolute inset-x-0 top-full border-b border-black/5 bg-white p-3 shadow-lg lg:hidden"
        >
          <ul className="grid grid-cols-2 gap-1">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm hover:bg-black/5",
                    isActive(link.href) ? "font-semibold" : "text-black/70",
                  )}
                  style={isActive(link.href) ? { color: accent } : undefined}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  );
}
