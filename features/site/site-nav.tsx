"use client";

import { useCallback, useEffect, useState } from "react";
import { Menu, ShieldCheck, X } from "lucide-react";
import { ADMIN_LOGIN_HREF, SITE_NAV_ITEMS, type SiteSectionId } from "@/lib/site/site-anchors";
import { cn } from "@/lib/utils";

/**
 * Navigation for the one-page temple site.
 *
 * Each item is a real `<a href="/about">` pointing at the standalone route,
 * and the click handler cancels that navigation only when the matching
 * section is actually present on the page. That ordering matters: with
 * JavaScript the devotee scrolls without a page load, and without it (or on
 * a section the temple has no content for, which renders nothing) the link
 * still goes somewhere real instead of dying silently on a `#hash`.
 *
 * Admin Login is not part of that set. It is a genuine navigation to the
 * existing tenant admin login on this same hostname, styled as clearly
 * secondary to the devotional links around it.
 */
export function SiteNav({ accent, ink }: { accent: string; ink: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<SiteSectionId | null>(null);

  // Scroll spy. One observer over whichever sections this temple renders, with
  // a band across the upper-middle of the viewport so the highlighted item is
  // the section the devotee is actually reading rather than whichever happens
  // to touch the top edge under the sticky header.
  useEffect(() => {
    const sections = SITE_NAV_ITEMS.map((item) => document.getElementById(item.id)).filter(
      (node): node is HTMLElement => node !== null,
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id as SiteSectionId);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((event: React.MouseEvent<HTMLAnchorElement>, id: SiteSectionId) => {
    const target = document.getElementById(id);
    // No such section on this temple's page — let the browser follow the href
    // to the standalone route instead of swallowing the click.
    if (!target) return;

    event.preventDefault();
    setOpen(false);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: still ? "auto" : "smooth", block: "start" });
    // Anchor navigation normally moves focus; scrollIntoView does not, so it is
    // moved explicitly or a keyboard user would carry on from the nav bar.
    target.focus({ preventScroll: true });
    setActive(id);
  }, []);

  return (
    <>
      <nav className="ml-auto hidden items-center gap-0.5 lg:flex" aria-label="Temple website">
        {SITE_NAV_ITEMS.map((item) => (
          <a
            key={item.id}
            href={item.fallbackHref}
            onClick={(event) => scrollToSection(event, item.id)}
            aria-current={active === item.id ? "true" : undefined}
            className={cn(
              "relative rounded-full px-3.5 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
              active === item.id ? "font-semibold" : "hover:bg-black/[0.04]",
            )}
            style={{ color: active === item.id ? accent : `${ink}B3` }}
          >
            {item.label}
            {active === item.id && (
              <span
                className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden="true"
              />
            )}
          </a>
        ))}
      </nav>

      <a
        href={ADMIN_LOGIN_HREF}
        className="ml-2 hidden items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:outline-none lg:inline-flex"
        style={{ borderColor: `${ink}26`, color: `${ink}CC` }}
      >
        <ShieldCheck className="size-4" aria-hidden="true" />
        Admin Login
      </a>

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="site-mobile-nav"
        aria-label={open ? "Close menu" : "Open menu"}
        className="ml-auto rounded-full p-2.5 transition-colors hover:bg-black/[0.04] focus-visible:ring-2 focus-visible:outline-none lg:hidden"
        style={{ color: ink }}
      >
        {open ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
      </button>

      {open && (
        <nav
          id="site-mobile-nav"
          aria-label="Temple website"
          className="absolute inset-x-0 top-full border-b border-black/5 bg-white/95 p-3 shadow-xl backdrop-blur lg:hidden"
        >
          <ul className="grid grid-cols-2 gap-1.5">
            {SITE_NAV_ITEMS.map((item) => (
              <li key={item.id}>
                <a
                  href={item.fallbackHref}
                  onClick={(event) => scrollToSection(event, item.id)}
                  aria-current={active === item.id ? "true" : undefined}
                  className={cn(
                    "block rounded-xl px-3.5 py-3 text-sm transition-colors",
                    active === item.id ? "font-semibold" : "hover:bg-black/[0.04]",
                  )}
                  style={{
                    color: active === item.id ? accent : `${ink}B3`,
                    backgroundColor: active === item.id ? `${accent}14` : undefined,
                  }}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>

          <a
            href={ADMIN_LOGIN_HREF}
            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-sm font-medium"
            style={{ borderColor: `${ink}26`, color: `${ink}CC` }}
          >
            <ShieldCheck className="size-4" aria-hidden="true" />
            Admin Login
          </a>
        </nav>
      )}
    </>
  );
}
