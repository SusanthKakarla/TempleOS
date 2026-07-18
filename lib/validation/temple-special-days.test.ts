import { describe, expect, it } from "vitest";
import { createSpecialDaySchema, updateSpecialDaySchema } from "./temple-special-days";

describe("createSpecialDaySchema", () => {
  const base = { date: "2026-09-05", occasion: "Ganesh Chaturthi" };

  it("accepts a minimal valid special day and defaults isClosed to false", () => {
    const result = createSpecialDaySchema.parse(base);
    expect(result.isClosed).toBe(false);
  });

  it("rejects an invalid date format", () => {
    expect(createSpecialDaySchema.safeParse({ ...base, date: "05-09-2026" }).success).toBe(false);
  });

  it("rejects a blank occasion", () => {
    expect(createSpecialDaySchema.safeParse({ ...base, occasion: "  " }).success).toBe(false);
  });

  it("accepts a closed day with no timings", () => {
    const result = createSpecialDaySchema.safeParse({ ...base, isClosed: true });
    expect(result.success).toBe(true);
  });

  it("rejects morning close before morning open", () => {
    const result = createSpecialDaySchema.safeParse({
      ...base,
      morningOpen: "12:00",
      morningClose: "10:00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a day with only evening hours overridden", () => {
    const result = createSpecialDaySchema.safeParse({
      ...base,
      eveningOpen: "17:00",
      eveningClose: "21:00",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateSpecialDaySchema", () => {
  it("allows a partial update with just isClosed", () => {
    expect(updateSpecialDaySchema.safeParse({ isClosed: true }).success).toBe(true);
  });

  it("allows an empty payload", () => {
    expect(updateSpecialDaySchema.safeParse({}).success).toBe(true);
  });

  it("rejects an invalid date on update", () => {
    expect(updateSpecialDaySchema.safeParse({ date: "not-a-date" }).success).toBe(false);
  });
});
