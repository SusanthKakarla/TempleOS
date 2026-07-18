import type { Event, Tenant, TempleFaq, TempleSeva, TempleSocialLink, TempleSpecialDay } from "@/types/db";
import { formatInr } from "@/lib/currency";

const MAX_SEVAS_IN_REPLY = 10;
const MAX_FAQS_IN_REPLY = 5;

export function buildMenuMessage(tenant: Tenant): string {
  const greeting = tenant.welcomeMessage?.trim() || `Namaste. Welcome to ${tenant.name}.`;
  return (
    `${greeting}\n` +
    `Reply with a number:\n` +
    `1. View upcoming events\n` +
    `2. Contact temple\n` +
    `3. Temple timings\n` +
    `4. Temple history\n` +
    `5. Temple sevas\n` +
    `6. Frequently asked questions`
  );
}

function formatEventDateTime(event: Event, timezone: string): { date: string; time: string } {
  const start = new Date(event.startsAt);
  return {
    date: start.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }),
    time: start.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }),
  };
}

function formatEventLine(event: Event, index: number, timezone: string): string {
  const { date, time } = formatEventDateTime(event, timezone);
  const description = event.description ? `\n   ${event.description}` : "";
  return `${index + 1}. ${event.title} - ${date}, ${time}${description}`;
}

export function buildEventsMessage(tenant: Tenant, events: Event[]): string {
  if (events.length === 0) {
    return "There are no upcoming events published right now. Please check again later.";
  }

  const lines = events.map((event, index) => formatEventLine(event, index, tenant.timezone));
  return (
    `Upcoming events at ${tenant.name}:\n\n${lines.join("\n\n")}\n\n` + `Reply "menu" to go back.`
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildContactMessage(tenant: Tenant, socialLinks: TempleSocialLink[] = []): string {
  const phone = tenant.defaultContactPhone ?? "the temple office";
  const address = tenant.address ? ` or visit ${tenant.address}` : "";
  const lines = [`Please call ${phone}${address}. A temple volunteer may respond when available.`];

  if (tenant.contactEmail) {
    lines.push(`Email: ${tenant.contactEmail}`);
  }
  if (tenant.googleMapsLink) {
    lines.push(`Directions: ${tenant.googleMapsLink}`);
  }
  if (socialLinks.length > 0) {
    lines.push(socialLinks.map((link) => `${capitalize(link.platform)}: ${link.url}`).join("\n"));
  }

  return lines.join("\n");
}

export function buildUnknownMessage(): string {
  return `Sorry, I did not understand. Reply "menu" to see options.`;
}

export function buildAnnouncementMessage(tenant: Tenant, event: Event): string {
  const { date, time } = formatEventDateTime(event, tenant.timezone);
  return (
    `Namaste. Upcoming event at ${tenant.name}: ${event.title} on ${date} at ${time}.\n` +
    `Reply "events" to view upcoming events.`
  );
}

/** Postgres TIME columns come back as "HH:MM:SS" — format as e.g. "6:00 AM". */
function formatTimeOfDay(time: string): string {
  const [hourStr, minuteStr] = time.split(":");
  const hour24 = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Special-day hours override regular hours per time-slot (not all-or-nothing)
 * — a festival often only changes evening hours, so a special day with just
 * eveningOpen/eveningClose set still falls back to the tenant's regular
 * morning hours.
 */
export function buildTimingsMessage(tenant: Tenant, specialDay: TempleSpecialDay | null): string {
  if (specialDay?.isClosed) {
    return `${tenant.name} is closed today for ${specialDay.occasion}.`;
  }

  const morningOpen = specialDay?.morningOpen ?? tenant.morningOpen;
  const morningClose = specialDay?.morningClose ?? tenant.morningClose;
  const eveningOpen = specialDay?.eveningOpen ?? tenant.eveningOpen;
  const eveningClose = specialDay?.eveningClose ?? tenant.eveningClose;

  if (!morningOpen && !morningClose && !eveningOpen && !eveningClose) {
    return "Temple timings have not been configured yet. Please contact the temple office.";
  }

  const lines = [`${tenant.name} timings${specialDay ? ` (${specialDay.occasion})` : ""}:`];
  if (morningOpen && morningClose) {
    lines.push(`\nMorning:\n${formatTimeOfDay(morningOpen)} - ${formatTimeOfDay(morningClose)}`);
  }
  if (eveningOpen && eveningClose) {
    lines.push(`\nEvening:\n${formatTimeOfDay(eveningOpen)} - ${formatTimeOfDay(eveningClose)}`);
  }
  return lines.join("\n");
}

export function buildHistoryMessage(tenant: Tenant): string {
  return (
    tenant.history?.trim() || "Temple history has not been added yet. Please contact the temple office."
  );
}

function formatSevaLine(seva: TempleSeva, index: number): string {
  const headParts = [`${index + 1}. ${seva.name}`];
  if (seva.price) headParts.push(`- ${formatInr(seva.price)}`);
  if (seva.duration) headParts.push(`(${seva.duration})`);

  const detailLines = [
    seva.description,
    seva.availableDays.length > 0 ? `Available: ${seva.availableDays.map(capitalize).join(", ")}` : null,
  ].filter((line): line is string => Boolean(line));

  return detailLines.length > 0
    ? `${headParts.join(" ")}\n   ${detailLines.join("\n   ")}`
    : headParts.join(" ");
}

export function buildSevasMessage(tenant: Tenant, sevas: TempleSeva[]): string {
  if (sevas.length === 0) {
    return "No sevas are listed yet. Please contact the temple office for seva information.";
  }

  const shown = sevas.slice(0, MAX_SEVAS_IN_REPLY);
  const lines = shown.map((seva, index) => formatSevaLine(seva, index));
  const trailer =
    sevas.length > MAX_SEVAS_IN_REPLY
      ? "\n\n...and more. Contact the temple office for the full list."
      : "";

  return `Sevas at ${tenant.name}:\n\n${lines.join("\n\n")}${trailer}`;
}

export function buildFaqMessage(tenant: Tenant, faqs: TempleFaq[]): string {
  if (faqs.length === 0) {
    return "No frequently asked questions have been added yet. Please contact the temple office.";
  }

  const shown = faqs.slice(0, MAX_FAQS_IN_REPLY);
  const lines = shown.map((faq, index) => `${index + 1}. ${faq.question}\n   ${faq.answer}`);
  const trailer = faqs.length > MAX_FAQS_IN_REPLY ? "\n\nMore questions? Contact the temple office." : "";

  return `Frequently asked questions:\n\n${lines.join("\n\n")}${trailer}`;
}

/**
 * The webhook server runs in UTC; a naive `new Date()` can land on the wrong
 * calendar day near midnight in the tenant's actual timezone, which would
 * make the special-day-for-today lookup miss. formatToParts avoids relying
 * on locale-specific separator quirks in Intl's raw `.format()` output.
 */
export function getTenantLocalDateISO(timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}
