import type { Event, Tenant } from "@/types/db";

export function buildMenuMessage(tenant: Tenant): string {
  return (
    `Namaste. Welcome to ${tenant.name}.\n` +
    `Reply with a number:\n` +
    `1. View upcoming events\n` +
    `2. Contact temple`
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

export function buildContactMessage(tenant: Tenant): string {
  const phone = tenant.defaultContactPhone ?? "the temple office";
  const address = tenant.address ? ` or visit ${tenant.address}` : "";
  return `Please call ${phone}${address}. A temple volunteer may respond when available.`;
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
