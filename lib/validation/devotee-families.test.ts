import { describe, expect, it } from "vitest";
import { createFamilySchema, updateFamilySchema } from "./devotee-families";

function member(overrides: Record<string, unknown> = {}) {
  return { displayName: "Ramesh Reddy", relationship: "head_of_family", ...overrides };
}

describe("createFamilySchema", () => {
  it("accepts a family with exactly one Head of Family", () => {
    const result = createFamilySchema.safeParse({
      familyName: "Reddy Family",
      members: [member(), member({ displayName: "Lakshmi Reddy", relationship: "wife" })],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a family with zero Head of Family members", () => {
    const result = createFamilySchema.safeParse({
      familyName: "Reddy Family",
      members: [member({ relationship: "wife" })],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a family with more than one Head of Family", () => {
    const result = createFamilySchema.safeParse({
      familyName: "Reddy Family",
      members: [member(), member({ displayName: "Suresh Reddy" })],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty member list", () => {
    const result = createFamilySchema.safeParse({ familyName: "Reddy Family", members: [] });
    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized relationship code", () => {
    const result = createFamilySchema.safeParse({
      familyName: "Reddy Family",
      members: [member({ relationship: "neighbor" })],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a blank family name", () => {
    const result = createFamilySchema.safeParse({ familyName: "  ", members: [member()] });
    expect(result.success).toBe(false);
  });
});

describe("updateFamilySchema", () => {
  it("accepts members with an existing id (update) alongside new ones (no id)", () => {
    const result = updateFamilySchema.safeParse({
      familyName: "Reddy Family",
      members: [
        { ...member(), id: "550e8400-e29b-41d4-a716-446655440000" },
        member({ displayName: "New Baby", relationship: "son" }),
      ],
    });
    expect(result.success).toBe(true);
  });

  it("still enforces exactly one Head of Family on update", () => {
    const result = updateFamilySchema.safeParse({
      familyName: "Reddy Family",
      members: [member({ relationship: "wife" })],
    });
    expect(result.success).toBe(false);
  });
});
