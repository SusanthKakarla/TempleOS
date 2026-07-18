import { describe, expect, it } from "vitest";
import type { Event, Tenant, TempleFaq, TempleSeva, TempleSocialLink, TempleSpecialDay } from "@/types/db";
import {
  buildAnnouncementMessage,
  buildContactMessage,
  buildEventsMessage,
  buildFaqMessage,
  buildHistoryMessage,
  buildMenuMessage,
  buildSevasMessage,
  buildTimingsMessage,
  buildUnknownMessage,
  getTenantLocalDateISO,
} from "./templates";

const tenant: Tenant = {
  id: "tenant-1",
  name: "Sri Venkateswara Temple",
  defaultContactPhone: "+919876500000",
  address: "123 Temple Street",
  timezone: "Asia/Kolkata",
  welcomeMessage: null,
  description: null,
  history: null,
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
  it("includes a default greeting and all numbered options", () => {
    const message = buildMenuMessage(tenant);
    expect(message).toContain(tenant.name);
    expect(message).toContain("1. View upcoming events");
    expect(message).toContain("2. Contact temple");
    expect(message).toContain("3. Temple timings");
    expect(message).toContain("4. Temple history");
    expect(message).toContain("5. Temple sevas");
    expect(message).toContain("6. Frequently asked questions");
  });

  it("uses the configured welcome message when set", () => {
    const message = buildMenuMessage({ ...tenant, welcomeMessage: "Om Namah Shivaya!" });
    expect(message).toContain("Om Namah Shivaya!");
  });
});

describe("buildEventsMessage", () => {
  it("returns a no-events message when the list is empty", () => {
    expect(buildEventsMessage(tenant, [])).toMatch(/no upcoming events/i);
  });

  it("lists events with title, date, time, and description", () => {
    const message = buildEventsMessage(tenant, [makeEvent()]);
    expect(message).toContain("Ganesh Chaturthi");
    expect(message).toContain("Special pooja and prasadam");
    expect(message).toContain("10:00");
    expect(message).toMatch(/reply "menu"/i);
  });

  it("numbers multiple events in order", () => {
    const message = buildEventsMessage(tenant, [
      makeEvent({ id: "1", title: "First Event" }),
      makeEvent({ id: "2", title: "Second Event" }),
    ]);
    expect(message.indexOf("1. First Event")).toBeGreaterThanOrEqual(0);
    expect(message.indexOf("2. Second Event")).toBeGreaterThan(message.indexOf("1. First Event"));
  });
});

describe("buildContactMessage", () => {
  it("includes phone and address when available", () => {
    const message = buildContactMessage(tenant);
    expect(message).toContain(tenant.defaultContactPhone);
    expect(message).toContain(tenant.address);
  });

  it("falls back gracefully when phone/address are missing", () => {
    const message = buildContactMessage({ ...tenant, defaultContactPhone: null, address: null });
    expect(message).toContain("the temple office");
  });

  it("includes email and maps link when configured", () => {
    const message = buildContactMessage({
      ...tenant,
      contactEmail: "office@temple.org",
      googleMapsLink: "https://maps.app.goo.gl/example",
    });
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
    const message = buildContactMessage(tenant, socialLinks);
    expect(message).toContain("Facebook: https://facebook.com/mytemple");
  });
});

describe("buildUnknownMessage", () => {
  it("nudges the devotee back to the menu", () => {
    expect(buildUnknownMessage()).toMatch(/reply "menu"/i);
  });
});

describe("buildAnnouncementMessage", () => {
  it("includes temple name, event title, date, and time", () => {
    const message = buildAnnouncementMessage(tenant, makeEvent());
    expect(message).toContain(tenant.name);
    expect(message).toContain("Ganesh Chaturthi");
    expect(message).toContain("10:00");
    expect(message).toMatch(/reply "events"/i);
  });
});

describe("buildTimingsMessage", () => {
  it("reports regular hours when no special day applies", () => {
    const message = buildTimingsMessage(
      { ...tenant, morningOpen: "06:00:00", morningClose: "12:00:00", eveningOpen: "16:30:00", eveningClose: "20:30:00" },
      null,
    );
    expect(message).toContain("6:00 AM - 12:00 PM");
    expect(message).toContain("4:30 PM - 8:30 PM");
  });

  it("reports a not-configured message when nothing is set", () => {
    expect(buildTimingsMessage(tenant, null)).toMatch(/not been configured/i);
  });

  it("reports closed for a special day marked closed", () => {
    const message = buildTimingsMessage(tenant, makeSpecialDay({ isClosed: true }));
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
    const message = buildTimingsMessage(regularTenant, specialDay);
    expect(message).toContain("6:00 AM - 12:00 PM"); // regular morning hours retained
    expect(message).toContain("6:00 PM - 10:00 PM"); // special evening hours applied
  });
});

describe("buildHistoryMessage", () => {
  it("returns the configured history", () => {
    expect(buildHistoryMessage({ ...tenant, history: "Built in 1850." })).toBe("Built in 1850.");
  });

  it("falls back when history is not set", () => {
    expect(buildHistoryMessage(tenant)).toMatch(/not been added/i);
  });
});

describe("buildSevasMessage", () => {
  it("returns a fallback message when there are no sevas", () => {
    expect(buildSevasMessage(tenant, [])).toMatch(/no sevas/i);
  });

  it("lists sevas with price, duration, and available days", () => {
    const message = buildSevasMessage(tenant, [makeSeva()]);
    expect(message).toContain("Archana");
    expect(message).toContain("15 minutes");
    expect(message).toContain("Available: Monday, Friday");
  });

  it("caps the list at 10 and adds a trailer when there are more", () => {
    const sevas = Array.from({ length: 12 }, (_, i) => makeSeva({ id: `seva-${i}`, name: `Seva ${i}` }));
    const message = buildSevasMessage(tenant, sevas);
    expect(message).toContain("Seva 9");
    expect(message).not.toContain("Seva 10");
    expect(message).toMatch(/and more/i);
  });
});

describe("buildFaqMessage", () => {
  it("returns a fallback message when there are no FAQs", () => {
    expect(buildFaqMessage(tenant, [])).toMatch(/no frequently asked questions/i);
  });

  it("lists questions and answers", () => {
    const message = buildFaqMessage(tenant, [makeFaq()]);
    expect(message).toContain("What time does the temple open?");
    expect(message).toContain("The temple opens at 6:00 AM.");
  });

  it("caps the list at 5 and adds a trailer when there are more", () => {
    const faqs = Array.from({ length: 7 }, (_, i) => makeFaq({ id: `faq-${i}`, question: `Question ${i}?` }));
    const message = buildFaqMessage(tenant, faqs);
    expect(message).toContain("Question 4?");
    expect(message).not.toContain("Question 5?");
    expect(message).toMatch(/more questions/i);
  });
});

describe("getTenantLocalDateISO", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(getTenantLocalDateISO("Asia/Kolkata")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
