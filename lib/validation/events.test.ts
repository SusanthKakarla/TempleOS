import { describe, expect, it } from "vitest";
import { createEventSchema, updateEventSchema } from "./events";

describe("createEventSchema", () => {
  const base = {
    title: "Ganesh Chaturthi",
    startsAt: "2026-09-05T10:00:00.000Z",
  };

  it("accepts a minimal valid event and defaults status to draft", () => {
    const result = createEventSchema.parse(base);
    expect(result.status).toBe("draft");
    expect(result.description).toBeUndefined();
  });

  it("rejects a blank title", () => {
    const result = createEventSchema.safeParse({ ...base, title: "   " });
    expect(result.success).toBe(false);
  });

  it("converts an empty description to null", () => {
    const result = createEventSchema.parse({ ...base, description: "   " });
    expect(result.description).toBeNull();
  });

  it("rejects an end time before the start time", () => {
    const result = createEventSchema.safeParse({
      ...base,
      endsAt: "2026-09-05T09:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("accepts an end time after the start time", () => {
    const result = createEventSchema.safeParse({
      ...base,
      endsAt: "2026-09-05T12:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid date string", () => {
    const result = createEventSchema.safeParse({ ...base, startsAt: "not-a-date" });
    expect(result.success).toBe(false);
  });
});

describe("updateEventSchema", () => {
  it("allows a partial update with only status", () => {
    const result = updateEventSchema.safeParse({ status: "published" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty title on update", () => {
    const result = updateEventSchema.safeParse({ title: "" });
    expect(result.success).toBe(false);
  });

  it("only cross-checks start/end when both are provided", () => {
    const result = updateEventSchema.safeParse({ endsAt: "2026-01-01T00:00:00.000Z" });
    expect(result.success).toBe(true);
  });
});
