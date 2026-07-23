import { describe, expect, it } from "vitest";
import type { Event, Tenant, TempleFaq, TempleSeva, TempleSocialLink, TempleSpecialDay } from "@/types/db";
import { t } from "./i18n";
import {
  buildContactMessage,
  buildDonationInfoMessage,
  buildEventCancelledNotification,
  buildEventNotificationMessage,
  buildEventUpdatedNotification,
  buildEventsMessage,
  buildFaqMessage,
  buildHelpMessage,
  buildHistoryMessage,
  buildLanguagePickerMessage,
  buildMenuMessage,
  buildNewEventNotification,
  buildSevasMessage,
  buildTimingsMessage,
  buildUnknownMessage,
  getTenantLocalDateISO,
} from "./templates";

const tenant: Tenant = {
  id: "tenant-1",
  slug: "sv-temple",
  name: "Sri Venkateswara Temple",
  status: "active",
  defaultContactPhone: "+919876500000",
  address: "123 Temple Street",
  timezone: "Asia/Kolkata",
  welcomeMessage: null,
  description: null,
  history: null,
  donationInfo: null,
  notifyOnNewEvent: true,
  notifyOnEventUpdated: true,
  notifyOnEventCancelled: true,
  contactEmail: null,
  googleMapsLink: null,
  morningOpen: null,
  morningClose: null,
  eveningOpen: null,
  eveningClose: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    tenantId: tenant.id,
    title: "Ganesh Chaturthi",
    description: "Special pooja and prasadam",
    location: "Main hall",
    startsAt: "2026-09-05T04:30:00.000Z", // 10:00 IST
    endsAt: null,
    status: "published",
    bannerMediaId: null,
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSeva(overrides: Partial<TempleSeva> = {}): TempleSeva {
  return {
    id: "seva-1",
    tenantId: tenant.id,
    name: "Archana",
    description: "A short prayer ritual",
    price: "100.00",
    duration: "15 minutes",
    availableDays: ["monday", "friday"],
    bookingEnabled: false,
    displayOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeFaq(overrides: Partial<TempleFaq> = {}): TempleFaq {
  return {
    id: "faq-1",
    tenantId: tenant.id,
    question: "What time does the temple open?",
    answer: "The temple opens at 6:00 AM.",
    displayOrder: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeSpecialDay(overrides: Partial<TempleSpecialDay> = {}): TempleSpecialDay {
  return {
    id: "special-1",
    tenantId: tenant.id,
    date: "2026-09-05",
    occasion: "Ganesh Chaturthi",
    isClosed: false,
    morningOpen: null,
    morningClose: null,
    eveningOpen: null,
    eveningClose: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("buildMenuMessage", () => {
  it("includes a default greeting and all menu rows (English)", () => {
    const message = buildMenuMessage(tenant, "en");
    expect(message.body).toContain(tenant.name);
    const rowTitles = message.sections.flatMap((s) => s.rows.map((r) => r.title));
    expect(rowTitles).toEqual([
      "Events",
      "Contact",
      "Timings",
      "History",
      "Sevas",
      "FAQ",
      "Donate",
      "Language",
    ]);
    const rowIds = message.sections.flatMap((s) => s.rows.map((r) => r.id));
    expect(rowIds).toEqual([
      "events",
      "contact",
      "timings",
      "history",
      "sevas",
      "faq",
      "donation_info",
      "change_language",
    ]);
  });

  it("uses the configured welcome message when set", () => {
    const message = buildMenuMessage({ ...tenant, welcomeMessage: "Om Namah Shivaya!" }, "en");
    expect(message.body).toContain("Om Namah Shivaya!");
  });

  it("renders all menu rows in Telugu", () => {
    const message = buildMenuMessage(tenant, "te");
    const rowTitles = message.sections.flatMap((s) => s.rows.map((r) => r.title));
    expect(rowTitles).toEqual([
      t("te", "menuRowEventsTitle"),
      t("te", "menuRowContactTitle"),
      t("te", "menuRowTimingsTitle"),
      t("te", "menuRowHistoryTitle"),
      t("te", "menuRowSevasTitle"),
      t("te", "menuRowFaqTitle"),
      t("te", "menuRowDonationInfoTitle"),
      t("te", "menuRowChangeLanguageTitle"),
    ]);
    // Row ids stay the stable English command strings regardless of language.
    expect(message.sections[0].rows[0].id).toBe("events");
  });
});

describe("buildLanguagePickerMessage", () => {
  it("returns bilingual body and both language buttons", () => {
    const message = buildLanguagePickerMessage();
    expect(message.body).toMatch(/choose your preferred language/i);
    expect(message.body).toMatch(/[ఀ-౿]/); // contains Telugu script
    expect(message.buttons).toEqual([
      { id: "lang_en", title: "English" },
      { id: "lang_te", title: "తెలుగు" },
    ]);
  });
});

describe("buildEventsMessage", () => {
  it("returns a no-events message when the list is empty", () => {
    expect(buildEventsMessage(tenant, [], "en")).toMatch(/no upcoming events/i);
  });

  it("lists events with title, date, time, and description", () => {
    const message = buildEventsMessage(tenant, [makeEvent()], "en");
    expect(message).toContain("Ganesh Chaturthi");
    expect(message).toContain("Special pooja and prasadam");
    expect(message).toContain("10:00");
    expect(message).toMatch(/reply "menu"/i);
  });

  it("numbers multiple events in order", () => {
    const message = buildEventsMessage(
      tenant,
      [makeEvent({ id: "1", title: "First Event" }), makeEvent({ id: "2", title: "Second Event" })],
      "en",
    );
    expect(message.indexOf("1. First Event")).toBeGreaterThanOrEqual(0);
    expect(message.indexOf("2. Second Event")).toBeGreaterThan(message.indexOf("1. First Event"));
  });

  it("localizes the header/footer to Telugu while leaving admin-authored content unchanged", () => {
    const message = buildEventsMessage(tenant, [makeEvent()], "te");
    expect(message).toContain(t("te", "eventsFooter"));
    // Verbatim admin content (event title/description) is never translated.
    expect(message).toContain("Ganesh Chaturthi");
    expect(message).toContain("Special pooja and prasadam");
  });
});

describe("buildContactMessage", () => {
  it("includes phone and address when available", () => {
    const message = buildContactMessage(tenant, "en");
    expect(message).toContain(tenant.defaultContactPhone);
    expect(message).toContain(tenant.address);
  });

  it("falls back gracefully when phone/address are missing", () => {
    const message = buildContactMessage({ ...tenant, defaultContactPhone: null, address: null }, "en");
    expect(message).toContain("the temple office");
  });

  it("includes email and maps link when configured", () => {
    const message = buildContactMessage(
      {
        ...tenant,
        contactEmail: "office@temple.org",
        googleMapsLink: "https://maps.app.goo.gl/example",
      },
      "en",
    );
    expect(message).toContain("office@temple.org");
    expect(message).toContain("https://maps.app.goo.gl/example");
  });

  it("includes social links when provided", () => {
    const socialLinks: TempleSocialLink[] = [
      {
        id: "link-1",
        tenantId: tenant.id,
        platform: "facebook",
        url: "https://facebook.com/mytemple",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const message = buildContactMessage(tenant, "en", socialLinks);
    expect(message).toContain("Facebook: https://facebook.com/mytemple");
  });

  it("localizes labels to Telugu (platform names stay English proper nouns)", () => {
    const socialLinks: TempleSocialLink[] = [
      {
        id: "link-1",
        tenantId: tenant.id,
        platform: "facebook",
        url: "https://facebook.com/mytemple",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ];
    const message = buildContactMessage(
      { ...tenant, contactEmail: "office@temple.org" },
      "te",
      socialLinks,
    );
    expect(message).toContain(t("te", "contactEmailLabel"));
    expect(message).toContain("Facebook: https://facebook.com/mytemple");
  });
});

describe("buildUnknownMessage", () => {
  it("nudges the devotee back to the menu", () => {
    expect(buildUnknownMessage("en")).toMatch(/reply "menu"/i);
  });

  it("renders in Telugu", () => {
    expect(buildUnknownMessage("te")).toBe(t("te", "unknownMessage"));
  });
});

describe("buildTimingsMessage", () => {
  it("reports regular hours when no special day applies", () => {
    const message = buildTimingsMessage(
      {
        ...tenant,
        morningOpen: "06:00:00",
        morningClose: "12:00:00",
        eveningOpen: "16:30:00",
        eveningClose: "20:30:00",
      },
      null,
      "en",
    );
    expect(message).toContain("6:00 AM - 12:00 PM");
    expect(message).toContain("4:30 PM - 8:30 PM");
  });

  it("reports a not-configured message when nothing is set", () => {
    expect(buildTimingsMessage(tenant, null, "en")).toMatch(/not been configured/i);
  });

  it("reports closed for a special day marked closed", () => {
    const message = buildTimingsMessage(tenant, makeSpecialDay({ isClosed: true }), "en");
    expect(message).toMatch(/closed today for ganesh chaturthi/i);
  });

  it("overrides only the evening slot when the special day only sets evening hours", () => {
    const regularTenant = {
      ...tenant,
      morningOpen: "06:00:00",
      morningClose: "12:00:00",
      eveningOpen: "16:30:00",
      eveningClose: "20:30:00",
    };
    const specialDay = makeSpecialDay({ eveningOpen: "18:00:00", eveningClose: "22:00:00" });
    const message = buildTimingsMessage(regularTenant, specialDay, "en");
    expect(message).toContain("6:00 AM - 12:00 PM"); // regular morning hours retained
    expect(message).toContain("6:00 PM - 10:00 PM"); // special evening hours applied
  });

  it("localizes labels to Telugu", () => {
    const message = buildTimingsMessage(
      { ...tenant, morningOpen: "06:00:00", morningClose: "12:00:00" },
      null,
      "te",
    );
    expect(message).toContain(t("te", "timingsMorningLabel"));
  });
});

describe("buildHistoryMessage", () => {
  it("returns the configured history", () => {
    expect(buildHistoryMessage({ ...tenant, history: "Built in 1850." }, "en")).toBe("Built in 1850.");
  });

  it("falls back when history is not set", () => {
    expect(buildHistoryMessage(tenant, "en")).toMatch(/not been added/i);
  });

  it("falls back with a Telugu message when history is not set and lang is Telugu", () => {
    expect(buildHistoryMessage(tenant, "te")).toBe(t("te", "historyFallback"));
  });
});

describe("buildDonationInfoMessage", () => {
  it("returns the configured donation info verbatim regardless of language", () => {
    const configured = { ...tenant, donationInfo: "UPI: temple@upi" };
    expect(buildDonationInfoMessage(configured, "en")).toBe("UPI: temple@upi");
    expect(buildDonationInfoMessage(configured, "te")).toBe("UPI: temple@upi");
  });

  it("falls back with a localized message when not set", () => {
    expect(buildDonationInfoMessage(tenant, "en")).toMatch(/not been added/i);
    expect(buildDonationInfoMessage(tenant, "te")).toBe(t("te", "donationInfoFallback"));
  });
});

describe("buildHelpMessage", () => {
  it("renders in the requested language", () => {
    expect(buildHelpMessage(tenant, "en")).toMatch(/how to use this chatbot/i);
    expect(buildHelpMessage(tenant, "te")).toBe(t("te", "helpBody", { temple: tenant.name }));
  });
});

describe("buildSevasMessage", () => {
  it("returns a fallback message when there are no sevas", () => {
    expect(buildSevasMessage(tenant, [], "en")).toMatch(/no sevas/i);
  });

  it("lists sevas with price, duration, and available days", () => {
    const message = buildSevasMessage(tenant, [makeSeva()], "en");
    expect(message).toContain("Archana");
    expect(message).toContain("15 minutes");
    expect(message).toContain("Available: Monday, Friday");
  });

  it("caps the list at 10 and adds a trailer when there are more", () => {
    const sevas = Array.from({ length: 12 }, (_, i) => makeSeva({ id: `seva-${i}`, name: `Seva ${i}` }));
    const message = buildSevasMessage(tenant, sevas, "en");
    expect(message).toContain("Seva 9");
    expect(message).not.toContain("Seva 10");
    expect(message).toMatch(/and more/i);
  });

  it("localizes day names to Telugu instead of leaking raw English day literals", () => {
    const message = buildSevasMessage(tenant, [makeSeva()], "te");
    expect(message).toContain("Archana"); // admin-authored seva name stays verbatim
    expect(message).toContain(`${t("te", "dayMonday")}, ${t("te", "dayFriday")}`);
    expect(message).not.toMatch(/monday|friday/i);
  });
});

describe("buildFaqMessage", () => {
  it("returns a fallback message when there are no FAQs", () => {
    expect(buildFaqMessage(tenant, [], "en")).toMatch(/no frequently asked questions/i);
  });

  it("lists questions and answers", () => {
    const message = buildFaqMessage(tenant, [makeFaq()], "en");
    expect(message).toContain("What time does the temple open?");
    expect(message).toContain("The temple opens at 6:00 AM.");
  });

  it("caps the list at 5 and adds a trailer when there are more", () => {
    const faqs = Array.from({ length: 7 }, (_, i) => makeFaq({ id: `faq-${i}`, question: `Question ${i}?` }));
    const message = buildFaqMessage(tenant, faqs, "en");
    expect(message).toContain("Question 4?");
    expect(message).not.toContain("Question 5?");
    expect(message).toMatch(/more questions/i);
  });

  it("localizes the header to Telugu while leaving admin-authored Q&A unchanged", () => {
    const message = buildFaqMessage(tenant, [makeFaq()], "te");
    expect(message).toContain(t("te", "faqHeader"));
    expect(message).toContain("What time does the temple open?");
  });
});

describe("formatEventDateTime locale (via buildEventsMessage)", () => {
  it("renders the event date/time using Telugu month names when lang is Telugu", () => {
    const message = buildEventsMessage(tenant, [makeEvent()], "te");
    // Intl te-IN renders the month name in Telugu script (e.g. "సెప్టెంబర్"), never "Sep".
    expect(message).not.toContain("Sep ");
  });
});

describe("event notification builders", () => {
  const notificationBuilders = [buildNewEventNotification, buildEventUpdatedNotification, buildEventCancelledNotification];

  for (const build of notificationBuilders) {
    describe(build.name, () => {
      it("resolves placeholders and includes the location line", () => {
        const message = build(tenant, makeEvent(), "en");
        expect(message.body).toContain(tenant.name);
        expect(message.body).toContain("Ganesh Chaturthi");
        expect(message.body).toContain("Main hall");
      });

      it("omits the location line when the event has no location", () => {
        const message = build(tenant, makeEvent({ location: null }), "en");
        expect(message.body).not.toMatch(/📍/);
      });

      it("has exactly the events/menu/contact buttons, each within Meta's 20-char limit", () => {
        for (const lang of ["en", "te"] as const) {
          const message = build(tenant, makeEvent(), lang);
          expect(message.buttons.map((b) => b.id)).toEqual(["events", "menu", "contact"]);
          for (const button of message.buttons) {
            expect(button.title.length).toBeLessThanOrEqual(20);
          }
        }
      });

      it("renders the Telugu intro while leaving the admin-authored event title unchanged", () => {
        const message = build(tenant, makeEvent(), "te");
        expect(message.body).toMatch(/[ఀ-౿]/); // contains Telugu script
        expect(message.body).toContain("Ganesh Chaturthi"); // admin-authored title stays verbatim
      });
    });
  }

  describe("buildEventNotificationMessage", () => {
    it("dispatches to the matching builder for each notification type", () => {
      const event = makeEvent();
      expect(buildEventNotificationMessage("new_event", tenant, event, "en")).toEqual(
        buildNewEventNotification(tenant, event, "en"),
      );
      expect(buildEventNotificationMessage("event_updated", tenant, event, "en")).toEqual(
        buildEventUpdatedNotification(tenant, event, "en"),
      );
      expect(buildEventNotificationMessage("event_cancelled", tenant, event, "en")).toEqual(
        buildEventCancelledNotification(tenant, event, "en"),
      );
    });
  });
});

describe("getTenantLocalDateISO", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(getTenantLocalDateISO("Asia/Kolkata")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
