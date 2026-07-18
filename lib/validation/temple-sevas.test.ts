import { describe, expect, it } from "vitest";
import { createSevaSchema, updateSevaSchema } from "./temple-sevas";

describe("createSevaSchema", () => {
  const base = { name: "Archana" };

  it("accepts a minimal valid seva and defaults availableDays/bookingEnabled", () => {
    const result = createSevaSchema.parse(base);
    expect(result.availableDays).toEqual([]);
    expect(result.bookingEnabled).toBe(false);
  });

  it("rejects a blank name", () => {
    expect(createSevaSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("rejects a negative price", () => {
    expect(createSevaSchema.safeParse({ ...base, price: -100 }).success).toBe(false);
  });

  it("accepts a zero price (free seva)", () => {
    expect(createSevaSchema.safeParse({ ...base, price: 0 }).success).toBe(true);
  });

  it("accepts a list of available days", () => {
    const result = createSevaSchema.parse({ ...base, availableDays: ["monday", "friday"] });
    expect(result.availableDays).toEqual(["monday", "friday"]);
  });

  it("rejects an invalid day name", () => {
    const result = createSevaSchema.safeParse({ ...base, availableDays: ["someday"] });
    expect(result.success).toBe(false);
  });

  it("converts an empty description to null", () => {
    const result = createSevaSchema.parse({ ...base, description: "  " });
    expect(result.description).toBeNull();
  });
});

describe("updateSevaSchema", () => {
  it("allows a partial update with only bookingEnabled", () => {
    expect(updateSevaSchema.safeParse({ bookingEnabled: true }).success).toBe(true);
  });

  it("allows an empty payload", () => {
    expect(updateSevaSchema.safeParse({}).success).toBe(true);
  });
});
