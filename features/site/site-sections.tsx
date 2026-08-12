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

export interface TimingWindow {
  label: string;
  opens: string;
  closes: string;
}

/** The temple's own timings, formatted for display. Empty when none are set. */
export function templeTimingWindows(content: TempleSiteContent): TimingWindow[] {
  const windows: TimingWindow[] = [];
  const morningOpen = formatTime(content.timings.morningOpen);
  const morningClose = formatTime(content.timings.morningClose);
  const eveningOpen = formatTime(content.timings.eveningOpen);
  const eveningClose = formatTime(content.timings.eveningClose);
  if (morningOpen && morningClose) windows.push({ label: "Morning", opens: morningOpen, closes: morningClose });
  if (eveningOpen && eveningClose) windows.push({ label: "Evening", opens: eveningOpen, closes: eveningClose });
  return windows;
}

export function TimingsList({ content }: { content: TempleSiteContent }) {
  const windows = templeTimingWindows(content);
  if (windows.length === 0) return null;
  const theme = SITE_THEMES[content.hero.theme];

  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {windows.map((window) => (
        <li key={window.label} className="rounded-2xl border border-black/5 bg-white p-5">
          <p className="text-xs font-medium tracking-wide uppercase" style={{ color: theme.accent }}>
            {window.label}
          </p>
          <p className="mt-1 font-heading text-xl" style={{ color: theme.ink }}>
            {window.opens} — {window.closes}
          </p>
        </li>
      ))}
    </ul>
  );
}

export function SevaCard({ seva, content }: { seva: SiteSeva; content: TempleSiteContent }) {
  const theme = SITE_THEMES[content.hero.theme];
  return (
    <article className="flex h-full flex-col rounded-2xl border border-black/5 bg-white p-5">
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
        <p className="mt-4 font-semibold" style={{ color: theme.accent }}>
          {formatInr(Number(seva.price))}
        </p>
      )}
    </article>
  );
}

export function EventCard({ event, content }: { event: SiteEvent; content: TempleSiteContent }) {
  const theme = SITE_THEMES[content.hero.theme];
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-black/5 bg-white">
      {event.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- external ImageKit URL
        <img src={event.imageUrl} alt="" loading="lazy" decoding="async" className="aspect-video w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col p-5">
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
        <Link
          href={`/events/${event.id}`}
          className="mt-4 text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
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
