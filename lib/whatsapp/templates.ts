import type {
  DayOfWeek,
  Event,
  EventNotificationType,
  SupportedLanguage,
  Tenant,
  TempleFaq,
  TempleSeva,
  TempleSocialLink,
  TempleSpecialDay,
} from "@/types/db";
import { formatInr } from "@/lib/currency";
import { t } from "./i18n";
import type { LocaleDictionary } from "./locales/types";
import type { InteractiveButton, InteractiveListSection } from "./client";

const MAX_SEVAS_IN_REPLY = 10;
const MAX_FAQS_IN_REPLY = 5;

export interface WhatsAppListMessage {
  body: string;
  buttonLabel: string;
  sections: InteractiveListSection[];
}

export interface WhatsAppButtonMessage {
  body: string;
  buttons: InteractiveButton[];
}

/** The main menu — a WhatsApp List Message (up to 10 rows; this uses 8, one section). */
export function buildMenuMessage(tenant: Tenant, lang: SupportedLanguage): WhatsAppListMessage {
  const greeting = tenant.welcomeMessage?.trim() || t(lang, "menuGreetingFallback", { temple: tenant.name });

  return {
    body: greeting,
    buttonLabel: t(lang, "menuButtonLabel"),
    sections: [
      {
        title: t(lang, "menuSectionTitle"),
        rows: [
          { id: "events", title: t(lang, "menuRowEventsTitle"), description: t(lang, "menuRowEventsDescription") },
          { id: "contact", title: t(lang, "menuRowContactTitle"), description: t(lang, "menuRowContactDescription") },
          { id: "timings", title: t(lang, "menuRowTimingsTitle"), description: t(lang, "menuRowTimingsDescription") },
          { id: "history", title: t(lang, "menuRowHistoryTitle"), description: t(lang, "menuRowHistoryDescription") },
          { id: "sevas", title: t(lang, "menuRowSevasTitle"), description: t(lang, "menuRowSevasDescription") },
          { id: "faq", title: t(lang, "menuRowFaqTitle"), description: t(lang, "menuRowFaqDescription") },
          {
            id: "donation_info",
            title: t(lang, "menuRowDonationInfoTitle"),
            description: t(lang, "menuRowDonationInfoDescription"),
          },
          {
            id: "change_language",
            title: t(lang, "menuRowChangeLanguageTitle"),
            description: t(lang, "menuRowChangeLanguageDescription"),
          },
        ],
      },
    ],
  };
}

/**
 * Bilingual by design — shown before a devotee has a preferred_language on
 * file, so there's no single language to render it in yet. Body/button
 * labels are identical literals duplicated in both locales/en.ts and te.ts.
 */
export function buildLanguagePickerMessage(): WhatsAppButtonMessage {
  return {
    body: t("en", "languagePickerBody"),
    buttons: [
      { id: "lang_en", title: t("en", "languagePickerButtonEnglish") },
      { id: "lang_te", title: t("en", "languagePickerButtonTelugu") },
    ],
  };
}

function formatEventDateTime(
  event: Event,
  timezone: string,
  lang: SupportedLanguage,
): { date: string; time: string } {
  const locale = lang === "te" ? "te-IN" : "en-IN";
  const start = new Date(event.startsAt);
  return {
    date: start.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: timezone,
    }),
    time: start.toLocaleTimeString(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: timezone,
    }),
  };
}

/** Shared 3-button row for every event notification (Meta caps at 3 buttons). */
function notificationButtons(lang: SupportedLanguage): InteractiveButton[] {
  return [
    { id: "events", title: t(lang, "notifyViewEventButton") },
    { id: "menu", title: t(lang, "notifyMainMenuButton") },
    { id: "contact", title: t(lang, "notifyContactButton") },
  ];
}

function buildNotificationBody(
  introKey: keyof LocaleDictionary,
  tenant: Tenant,
  event: Event,
  lang: SupportedLanguage,
): string {
  const { date, time } = formatEventDateTime(event, tenant.timezone, lang);
  const intro = t(lang, introKey, { temple: tenant.name, title: event.title, date, time });
  const locationLine = event.location ? `\n${t(lang, "notifyLocationLine", { location: event.location })}` : "";
  return `${intro}${locationLine}\n${t(lang, "notifyFooter")}`;
}

/**
 * The "View Events" button lists ALL upcoming published events (id "events",
 * the same stateless command as the main menu row) — not the specific event
 * just announced. The bot has no conversation state (NFR-009 in router.ts),
 * so a per-event drill-down isn't possible; the button label says "Events"
 * (plural) to set the right expectation.
 */
export function buildNewEventNotification(tenant: Tenant, event: Event, lang: SupportedLanguage): WhatsAppButtonMessage {
  return { body: buildNotificationBody("notifyNewEventIntro", tenant, event, lang), buttons: notificationButtons(lang) };
}

export function buildEventUpdatedNotification(tenant: Tenant, event: Event, lang: SupportedLanguage): WhatsAppButtonMessage {
  return { body: buildNotificationBody("notifyEventUpdatedIntro", tenant, event, lang), buttons: notificationButtons(lang) };
}

export function buildEventCancelledNotification(tenant: Tenant, event: Event, lang: SupportedLanguage): WhatsAppButtonMessage {
  return { body: buildNotificationBody("notifyEventCancelledIntro", tenant, event, lang), buttons: notificationButtons(lang) };
}

const NOTIFICATION_BUILDER_BY_TYPE: Record<
  EventNotificationType,
  (tenant: Tenant, event: Event, lang: SupportedLanguage) => WhatsAppButtonMessage
> = {
  new_event: buildNewEventNotification,
  event_updated: buildEventUpdatedNotification,
  event_cancelled: buildEventCancelledNotification,
};

export function buildEventNotificationMessage(
  type: EventNotificationType,
  tenant: Tenant,
  event: Event,
  lang: SupportedLanguage,
): WhatsAppButtonMessage {
  return NOTIFICATION_BUILDER_BY_TYPE[type](tenant, event, lang);
}

function formatEventLine(event: Event, index: number, timezone: string, lang: SupportedLanguage): string {
  const { date, time } = formatEventDateTime(event, timezone, lang);
  const description = event.description ? `\n   ${event.description}` : "";
  return `${index + 1}. ${event.title} - ${date}, ${time}${description}`;
}

export function buildEventsMessage(tenant: Tenant, events: Event[], lang: SupportedLanguage): string {
  if (events.length === 0) {
    return t(lang, "eventsEmpty");
  }

  const lines = events.map((event, index) => formatEventLine(event, index, tenant.timezone, lang));
  return `${t(lang, "eventsHeader", { temple: tenant.name })}\n\n${lines.join("\n\n")}\n\n${t(lang, "eventsFooter")}`;
}

/** Proper nouns (Facebook, Instagram, ...) — stays English-only in both languages, unlike day names. */
function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildContactMessage(
  tenant: Tenant,
  lang: SupportedLanguage,
  socialLinks: TempleSocialLink[] = [],
): string {
  const phone = tenant.defaultContactPhone ?? t(lang, "contactFallbackPhone");
  const address = tenant.address ? ` or visit ${tenant.address}` : "";
  const lines = [`${phone}${address}`];

  if (tenant.contactEmail) {
    lines.push(`${t(lang, "contactEmailLabel")}: ${tenant.contactEmail}`);
  }
  if (tenant.googleMapsLink) {
    lines.push(`${t(lang, "contactDirectionsLabel")}: ${tenant.googleMapsLink}`);
  }
  if (socialLinks.length > 0) {
    lines.push(socialLinks.map((link) => `${capitalize(link.platform)}: ${link.url}`).join("\n"));
  }

  return lines.join("\n");
}

export function buildUnknownMessage(lang: SupportedLanguage): string {
  return t(lang, "unknownMessage");
}

export function buildAnnouncementMessage(tenant: Tenant, event: Event, lang: SupportedLanguage): string {
  const { date, time } = formatEventDateTime(event, tenant.timezone, lang);
  const intro = t(lang, "announcementIntro", { temple: tenant.name, title: event.title, date, time });
  return `${intro}\n${t(lang, "announcementFooter")}`;
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
export function buildTimingsMessage(
  tenant: Tenant,
  specialDay: TempleSpecialDay | null,
  lang: SupportedLanguage,
): string {
  if (specialDay?.isClosed) {
    return t(lang, "timingsClosedForOccasion", { temple: tenant.name, occasion: specialDay.occasion });
  }

  const morningOpen = specialDay?.morningOpen ?? tenant.morningOpen;
  const morningClose = specialDay?.morningClose ?? tenant.morningClose;
  const eveningOpen = specialDay?.eveningOpen ?? tenant.eveningOpen;
  const eveningClose = specialDay?.eveningClose ?? tenant.eveningClose;

  if (!morningOpen && !morningClose && !eveningOpen && !eveningClose) {
    return t(lang, "timingsNotConfigured");
  }

  const header = specialDay
    ? t(lang, "timingsHeaderWithOccasion", { temple: tenant.name, occasion: specialDay.occasion })
    : t(lang, "timingsHeader", { temple: tenant.name });
  const lines = [header];
  if (morningOpen && morningClose) {
    lines.push(`\n${t(lang, "timingsMorningLabel")}\n${formatTimeOfDay(morningOpen)} - ${formatTimeOfDay(morningClose)}`);
  }
  if (eveningOpen && eveningClose) {
    lines.push(`\n${t(lang, "timingsEveningLabel")}\n${formatTimeOfDay(eveningOpen)} - ${formatTimeOfDay(eveningClose)}`);
  }
  return lines.join("\n");
}

export function buildHistoryMessage(tenant: Tenant, lang: SupportedLanguage): string {
  return tenant.history?.trim() || t(lang, "historyFallback");
}

export function buildDonationInfoMessage(tenant: Tenant, lang: SupportedLanguage): string {
  return tenant.donationInfo?.trim() || t(lang, "donationInfoFallback");
}

export function buildHelpMessage(tenant: Tenant, lang: SupportedLanguage): string {
  return t(lang, "helpBody", { temple: tenant.name });
}

const DAY_LOCALE_KEY: Record<DayOfWeek, "dayMonday" | "dayTuesday" | "dayWednesday" | "dayThursday" | "dayFriday" | "daySaturday" | "daySunday"> = {
  monday: "dayMonday",
  tuesday: "dayTuesday",
  wednesday: "dayWednesday",
  thursday: "dayThursday",
  friday: "dayFriday",
  saturday: "daySaturday",
  sunday: "daySunday",
};

function formatDayName(day: DayOfWeek, lang: SupportedLanguage): string {
  return t(lang, DAY_LOCALE_KEY[day]);
}

function formatSevaLine(seva: TempleSeva, index: number, lang: SupportedLanguage): string {
  const headParts = [`${index + 1}. ${seva.name}`];
  if (seva.price) headParts.push(`- ${formatInr(seva.price)}`);
  if (seva.duration) headParts.push(`(${seva.duration})`);

  const detailLines = [
    seva.description,
    seva.availableDays.length > 0
      ? `${t(lang, "sevasAvailableLabel")}: ${seva.availableDays.map((day) => formatDayName(day, lang)).join(", ")}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return detailLines.length > 0
    ? `${headParts.join(" ")}\n   ${detailLines.join("\n   ")}`
    : headParts.join(" ");
}

export function buildSevasMessage(tenant: Tenant, sevas: TempleSeva[], lang: SupportedLanguage): string {
  if (sevas.length === 0) {
    return t(lang, "sevasEmpty");
  }

  const shown = sevas.slice(0, MAX_SEVAS_IN_REPLY);
  const lines = shown.map((seva, index) => formatSevaLine(seva, index, lang));
  const trailer = sevas.length > MAX_SEVAS_IN_REPLY ? t(lang, "sevasTrailer") : "";

  return `${t(lang, "sevasHeader", { temple: tenant.name })}\n\n${lines.join("\n\n")}${trailer}`;
}

export function buildFaqMessage(tenant: Tenant, faqs: TempleFaq[], lang: SupportedLanguage): string {
  if (faqs.length === 0) {
    return t(lang, "faqEmpty");
  }

  const shown = faqs.slice(0, MAX_FAQS_IN_REPLY);
  const lines = shown.map((faq, index) => `${index + 1}. ${faq.question}\n   ${faq.answer}`);
  const trailer = faqs.length > MAX_FAQS_IN_REPLY ? t(lang, "faqTrailer") : "";

  return `${t(lang, "faqHeader")}\n\n${lines.join("\n\n")}${trailer}`;
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

/**
 * The UTC instant corresponding to local midnight, today, in `timezone` —
 * used for "today's messages"-style stat queries. Starts with a naive guess
 * (the tenant-local date interpreted as UTC), then corrects by the actual
 * wall-clock offset at that instant (DST-safe, unlike a fixed offset table).
 */
export function getTenantDayStartUTC(timezone: string): Date {
  const dateStr = getTenantLocalDateISO(timezone);
  const [year, month, day] = dateStr.split("-").map(Number);
  const naiveUTC = Date.UTC(year, month - 1, day, 0, 0, 0);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(naiveUTC));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const hour = get("hour") % 24; // some engines report midnight as "24" with hour12:false
  const wallClockAsUTC = Date.UTC(get("year"), get("month") - 1, get("day"), hour, get("minute"), get("second"));

  return new Date(naiveUTC - (wallClockAsUTC - naiveUTC));
}
