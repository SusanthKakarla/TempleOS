import { describe, expect, it } from "vitest";
import type { Event } from "@/types/db";
import { EVENT_EXPORT_COLUMNS } from "./events";

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "event-1",
    tenantId: "tenant-1",
    title: "Ganesh Chaturthi",
    description: "Special pooja",
    location: "Main hall",
    startsAt: "2026-09-05T04:30:00.000Z",
    endsAt: null,
    status: "published",
    createdBy: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function accessorFor(key: string) {
  const column = EVENT_EXPORT_COLUMNS.find((c) => c.key === key);
  if (!column) throw new Error(`No export column with key "${key}"`);
  return column.accessor;
}

describe("EVENT_EXPORT_COLUMNS", () => {
  it("passes admin-authored title/description through verbatim", () => {
    const event = makeEvent();
    expect(accessorFor("title")(event)).toBe("Ganesh Chaturthi");
    expect(accessorFor("description")(event)).toBe("Special pooja");
  });

  it("falls back to an em dash when endsAt/location/description are unset", () => {
    const event = makeEvent({ endsAt: null, location: null, description: null });
    expect(accessorFor("endsAt")(event)).toBe("—");
    expect(accessorFor("location")(event)).toBe("—");
    expect(accessorFor("description")(event)).toBe("—");
  });

  it("reports the current status verbatim, including cancelled", () => {
    expect(accessorFor("status")(makeEvent({ status: "cancelled" }))).toBe("cancelled");
  });
});
