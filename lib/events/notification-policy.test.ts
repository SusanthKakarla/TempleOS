import { describe, expect, it } from "vitest";
import type { Event, Tenant } from "@/types/db";
import { decideEventNotificationType, isAutoNotifyEnabled } from "./notification-policy";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    tenantId: "tenant-1",
    title: "Ganesh Chaturthi",
    description: "Special pooja",
    location: "Main hall",
    startsAt: "2026-09-05T04:30:00.000Z",
    endsAt: null,
    status: "draft",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("decideEventNotificationType", () => {
  it("returns new_event on draft -> published", () => {
    const prior = makeEvent({ status: "draft" });
    const next = makeEvent({ status: "published" });
    expect(decideEventNotificationType(prior, next)).toBe("new_event");
  });

  it("returns new_event on cancelled -> published (reopen)", () => {
    const prior = makeEvent({ status: "cancelled" });
    const next = makeEvent({ status: "published" });
    expect(decideEventNotificationType(prior, next)).toBe("new_event");
  });

  it("returns null on published -> draft (unpublish stays silent)", () => {
    const prior = makeEvent({ status: "published" });
    const next = makeEvent({ status: "draft" });
    expect(decideEventNotificationType(prior, next)).toBeNull();
  });

  it("returns event_cancelled when a draft or published event is cancelled", () => {
    expect(decideEventNotificationType(makeEvent({ status: "draft" }), makeEvent({ status: "cancelled" }))).toBe(
      "event_cancelled",
    );
    expect(
      decideEventNotificationType(makeEvent({ status: "published" }), makeEvent({ status: "cancelled" })),
    ).toBe("event_cancelled");
  });

  it("returns null when already cancelled and staying cancelled", () => {
    const prior = makeEvent({ status: "cancelled" });
    const next = makeEvent({ status: "cancelled", description: "Different text" });
    expect(decideEventNotificationType(prior, next)).toBeNull();
  });

  it("returns event_updated when a published event's material fields change", () => {
    const prior = makeEvent({ status: "published", title: "Old Title" });
    const next = makeEvent({ status: "published", title: "New Title" });
    expect(decideEventNotificationType(prior, next)).toBe("event_updated");
  });

  it.each([
    ["startsAt", { startsAt: "2026-09-06T04:30:00.000Z" }],
    ["endsAt", { endsAt: "2026-09-05T06:30:00.000Z" }],
    ["location", { location: "Annex hall" }],
    ["description", { description: "Updated description" }],
  ] as const)("treats a %s change as material", (_field, override) => {
    const prior = makeEvent({ status: "published" });
    const next = makeEvent({ status: "published", ...override });
    expect(decideEventNotificationType(prior, next)).toBe("event_updated");
  });

  it("returns null when published -> published with no material change", () => {
    const prior = makeEvent({ status: "published" });
    const next = makeEvent({ status: "published" });
    expect(decideEventNotificationType(prior, next)).toBeNull();
  });

  it("returns null for draft -> draft edits", () => {
    const prior = makeEvent({ status: "draft", title: "Old" });
    const next = makeEvent({ status: "draft", title: "New" });
    expect(decideEventNotificationType(prior, next)).toBeNull();
  });
});

describe("isAutoNotifyEnabled", () => {
  const baseTenant: Tenant = {
    id: "tenant-1",
    slug: "sv-temple",
    name: "Sri Venkateswara Temple",
    status: "active",
    defaultContactPhone: null,
    address: null,
    timezone: "Asia/Kolkata",
    welcomeMessage: null,
    description: null,
    history: null,
    donationInfo: null,
    notifyOnNewEvent: true,
    notifyOnEventUpdated: false,
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

  it("reads the toggle matching each notification type", () => {
    expect(isAutoNotifyEnabled(baseTenant, "new_event")).toBe(true);
    expect(isAutoNotifyEnabled(baseTenant, "event_updated")).toBe(false);
    expect(isAutoNotifyEnabled(baseTenant, "event_cancelled")).toBe(true);
  });
});
