import Link from "next/link";
import { SITE_THEMES } from "@/lib/site/site-theme";
import type { SiteEvent, SiteImage, SiteSeva } from "@/lib/site/site-data";
import type { TempleSiteContent } from "@/lib/site/temple-content";
import { formatDateTime } from "@/lib/date";
import { formatInr } from "@/lib/currency";

/**
 * The reusable blocks every public page is built from. Each renders nothing
 * when it has nothing to show, so a temple that filled in only part of its
 * profile gets a shorter site rather than a site full of empty cards.
 */

export function PageHeader({
  title,
  subtitle,
  content,
}: {
  title: string;
  subtitle?: string | null;
  content: TempleSiteContent;
}) {
  const theme = SITE_THEMES[content.hero.theme];
  return (
    <header className="text-white" style={{ backgroundColor: theme.base }}>
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-16">
        <h1 className="font-heading text-3xl sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-3 max-w-2xl text-sm text-white/80 sm:text-base">{subtitle}</p>}
      </div>
    </header>
  );
}

/**
 * One band of the one-page site.
 *
 * Owns the anchor id, the scroll offset that keeps a heading clear of the
 * sticky header, and the eyebrow/title pairing every section shares — so the
 * page reads as one continuous document rather than a stack of independent
 * pages, and no section can drift from the rhythm of the others.
 *
 * `tabIndex={-1}` makes the section a focus target: the nav moves focus here
 * after scrolling, which an anchor would have done for free and a programmatic
 * scroll does not.
 */
export function SiteSection({
  id,
  eyebrow,
  title,
  content,
  tone = "surface",
  width = "wide",
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  content: TempleSiteContent;
  /** `raised` tints the band so consecutive sections separate without a hard rule. */
  tone?: "surface" | "raised";
  width?: "wide" | "narrow";
  children: React.ReactNode;
}) {
  const theme = SITE_THEMES[content.hero.theme];

  return (
    <section
      id={id}
      tabIndex={-1}
      className="site-section relative scroll-mt-20 py-16 md:py-24"
      style={tone === "raised" ? { backgroundColor: `${theme.accent}0A` } : undefined}
      aria-labelledby={`${id}-heading`}
    >
      <div className={`mx-auto px-5 md:px-8 ${width === "narrow" ? "max-w-3xl" : "max-w-6xl"}`}>
        <div className="flex flex-col items-center text-center">
          {eyebrow && (
            <p className="text-[0.68rem] font-medium tracking-[0.3em] uppercase" style={{ color: theme.accent }}>
              {eyebrow}
            </p>
          )}
          <h2 id={`${id}-heading`} className="mt-3 font-heading text-[clamp(1.6rem,4.5vw,2.5rem)] leading-tight" style={{ color: theme.ink }}>
            {title}
          </h2>
          <SectionOrnament accent={theme.accent} />
        </div>

        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}

/** A small drawn divider under each section heading — a lamp flame between two rules. */
export function SectionOrnament({ accent }: { accent: string }) {
  return (
    <svg className="mt-5 h-3 w-28" viewBox="0 0 112 12" fill="none" aria-hidden="true">
      <path d="M0 6H42" stroke={accent} strokeWidth="1" opacity="0.35" />
      <path d="M70 6H112" stroke={accent} strokeWidth="1" opacity="0.35" />
      <path d="M56 1c3.2 2.6 4.8 4.6 4.8 6.4a4.8 4.8 0 0 1-9.6 0C51.2 5.6 52.8 3.6 56 1Z" fill={accent} opacity="0.75" />
    </svg>
  );
}

export function SectionHeading({ title, accent }: { title: string; accent: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-8 shrink-0" style={{ backgroundColor: accent }} aria-hidden="true" />
      <h2 className="font-heading text-2xl sm:text-3xl">{title}</h2>
    </div>
  );
}

/** Long admin-entered text: paragraphs split on blank lines, rendered as text and never as HTML. */
export function ProseBlock({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="mt-4 text-sm leading-relaxed first:mt-0 sm:text-base">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [hourText, minute] = value.split(":");
  const hour = Number(hourText);
  if (Number.isNaN(hour) || !minute) return null;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${minute} ${suffix}`;
}

/** "HH:MM:SS" → minutes since midnight, or null when unparseable. */
function toMinutes(value: string | null): number | null {
  if (!value) return null;
  const [hour, minute] = value.split(":");
  const h = Number(hour);
  const m = Number(minute);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

/**
 * The temple's local wall-clock time in minutes since midnight.
 *
 * Read through Intl in the temple's own timezone, never the server's: a
 * Railway container in UTC must not tell devotees in Vijayawada that their
 * temple is shut. The public pages are rendered per request, so this is
 * evaluated fresh on each visit rather than baked into a cached page.
 */
function minutesNowInTimeZone(timeZone: string, now: Date = new Date()): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((part) => part.type === "hour")?.value);
    const minute = Number(parts.find((part) => part.type === "minute")?.value);
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
    return hour * 60 + minute;
  } catch {
    // An invalid timezone must not take the page down — the status is simply
    // not shown, and the timings themselves still render.
    return null;
  }
}

export interface TimingWindow {
  label: string;
  opens: string;
  closes: string;
  /** True when the temple is inside this window right now, null when it can't be determined. */
  openNow: boolean | null;
}

/** The temple's own timings, formatted for display. Empty when none are set. */
export function templeTimingWindows(content: TempleSiteContent, now: Date = new Date()): TimingWindow[] {
  const minutesNow = minutesNowInTimeZone(content.timezone, now);

  const build = (label: string, open: string | null, close: string | null): TimingWindow | null => {
    const opens = formatTime(open);
    const closes = formatTime(close);
    if (!opens || !closes) return null;

    const from = toMinutes(open);
    const to = toMinutes(close);
    const openNow =
      minutesNow === null || from === null || to === null ? null : minutesNow >= from && minutesNow < to;

    return { label, opens, closes, openNow };
  };

  return [
    build("Morning", content.timings.morningOpen, content.timings.morningClose),
    build("Evening", content.timings.eveningOpen, content.timings.eveningClose),
  ].filter((window): window is TimingWindow => window !== null);
}

export function TimingsList({ content, now }: { content: TempleSiteContent; now?: Date }) {
  const windows = templeTimingWindows(content, now);
  if (windows.length === 0) return null;
  const theme = SITE_THEMES[content.hero.theme];

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {windows.map((window) => (
        <li
          key={window.label}
          className="site-lift relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm"
        >
          <span
            className="absolute inset-y-0 left-0 w-1"
            style={{ backgroundColor: window.openNow ? theme.accent : `${theme.accent}33` }}
            aria-hidden="true"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium tracking-[0.2em] uppercase" style={{ color: theme.accent }}>
              {window.label} darshan
            </p>
            {window.openNow !== null && (
              <span
                className="rounded-full px-2.5 py-1 text-[0.65rem] font-semibold tracking-wide uppercase"
                style={
                  window.openNow
                    ? { backgroundColor: `${theme.accent}1F`, color: theme.accent }
                    : { backgroundColor: "rgba(0,0,0,0.05)", color: theme.inkMuted }
                }
              >
                {window.openNow ? "Open now" : "Closed"}
              </span>
            )}
          </div>
          <p className="mt-2 font-heading text-2xl" style={{ color: theme.ink }}>
            {window.opens} <span style={{ color: theme.inkMuted }}>—</span> {window.closes}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SevaCard({ seva, content }: { seva: SiteSeva; content: TempleSiteContent }) {
  const theme = SITE_THEMES[content.hero.theme];
  return (
    <article className="site-lift flex h-full flex-col rounded-3xl border border-black/[0.06] bg-white p-6 shadow-sm">
      <h3 className="font-heading text-lg" style={{ color: theme.ink }}>
        {seva.name}
      </h3>
      {seva.description && (
        <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.inkMuted }}>
          {seva.description}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: theme.inkMuted }}>
        {seva.duration && <span>{seva.duration}</span>}
        {seva.availableDays.length > 0 && <span className="capitalize">{seva.availableDays.join(", ")}</span>}
      </div>
      {seva.price && Number(seva.price) > 0 && (
        <p className="mt-auto pt-4 font-heading text-xl" style={{ color: theme.accent }}>
          {formatInr(Number(seva.price))}
        </p>
      )}
    </article>
  );
}

export function EventCard({ event, content }: { event: SiteEvent; content: TempleSiteContent }) {
  const theme = SITE_THEMES[content.hero.theme];
  return (
    <article className="site-lift flex h-full flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white shadow-sm">
      {event.imageUrl && (
        <div className="overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL */}
          <img
            src={event.imageUrl}
            alt=""
            loading="lazy"
            decoding="async"
            className="aspect-video w-full object-cover transition-transform duration-700 hover:scale-105 motion-reduce:transition-none motion-reduce:hover:scale-100"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6">
        <p className="text-xs font-medium tracking-wide uppercase" style={{ color: theme.accent }}>
          {formatDateTime(event.startsAt, "en")}
        </p>
        <h3 className="mt-2 font-heading text-lg" style={{ color: theme.ink }}>
          {event.title}
        </h3>
        {event.location && (
          <p className="mt-1 text-sm" style={{ color: theme.inkMuted }}>
            {event.location}
          </p>
        )}
        {event.description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed" style={{ color: theme.inkMuted }}>
            {event.description}
          </p>
        )}
        {/* An individual event still opens its own page — that is a different
            event, not a different section of this one. */}
        <Link
          href={`/events/${event.id}`}
          className="mt-auto pt-4 text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
          style={{ color: theme.accent }}
        >
          Read more<span className="sr-only"> about {event.title}</span>
        </Link>
      </div>
    </article>
  );
}

export function EmptyNotice({ message, content }: { message: string; content: TempleSiteContent }) {
  const theme = SITE_THEMES[content.hero.theme];
  return (
    <p
      className="rounded-2xl border border-dashed border-black/10 p-8 text-center text-sm"
      style={{ color: theme.inkMuted }}
    >
      {message}
    </p>
  );
}

export function GalleryPreviewGrid({ images }: { images: SiteImage[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {images.map((image) => (
        // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL
        <img
          key={image.id}
          src={image.url}
          alt={image.title ?? ""}
          width={image.width ?? 800}
          height={image.height ?? 600}
          loading="lazy"
          decoding="async"
          className="aspect-square w-full rounded-2xl border border-black/5 object-cover"
        />
      ))}
    </div>
  );
}
