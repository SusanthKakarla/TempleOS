import { describe, expect, it } from "vitest";
import type { Event, Tenant } from "@/types/db";
import {
  buildAnnouncementMessage,
  buildContactMessage,
  buildEventsMessage,
  buildMenuMessage,
  buildUnknownMessage,
} from "./templates";

const tenant: Tenant = {
  id: "tenant-1",
  name: "Sri Venkateswara Temple",
  defaultContactPhone: "+919876500000",
  address: "123 Temple Street",
  timezone: "Asia/Kolkata",
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

describe("buildMenuMessage", () => {
  it("includes the temple name and numbered options", () => {
    const message = buildMenuMessage(tenant);
    expect(message).toContain(tenant.name);
    expect(message).toContain("1. View upcoming events");
    expect(message).toContain("2. Contact temple");
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
