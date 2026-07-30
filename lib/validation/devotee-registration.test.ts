import { describe, expect, it } from "vitest";
import { devoteeRegistrationSchema } from "./devotee-registration";

const devotee = {
  displayName: "Ravi Kumar",
  whatsappPhone: "+919876543210",
};

describe("devoteeRegistrationSchema", () => {
  it("accepts a no-family registration", () => {
    const result = devoteeRegistrationSchema.parse({
      devotee,
      family: { mode: "none" },
    });

    expect(result.family.mode).toBe("none");
  });

  it("accepts an existing-family registration with a relationship", () => {
    const result = devoteeRegistrationSchema.safeParse({
      devotee,
      family: {
        mode: "existing",
        familyId: "550e8400-e29b-41d4-a716-446655440000",
        relationship: "son",
      },
    });

    expect(result.success).toBe(true);
  });

  it("accepts a new-family registration with existing and new members", () => {
    const result = devoteeRegistrationSchema.safeParse({
      devotee,
      family: {
        mode: "new",
        familyName: "Kumar Family",
        primaryRelationship: "head_of_family",
        members: [
          {
            kind: "existing",
            devoteeId: "550e8400-e29b-41d4-a716-446655440001",
            relationship: "wife",
            moveFromExistingFamily: true,
          },
          {
            kind: "new",
            displayName: "Arjun Kumar",
            relationship: "son",
            whatsappPhone: "",
          },
        ],
      },
    });

    expect(result.success).toBe(true);
  });

  it("rejects a new-family registration with zero heads", () => {
    const result = devoteeRegistrationSchema.safeParse({
      devotee,
      family: {
        mode: "new",
        familyName: "Kumar Family",
        primaryRelationship: "son",
        members: [{ kind: "new", displayName: "Arjun Kumar", relationship: "daughter" }],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a new-family registration with more than one head", () => {
    const result = devoteeRegistrationSchema.safeParse({
      devotee,
      family: {
        mode: "new",
        familyName: "Kumar Family",
        primaryRelationship: "head_of_family",
        members: [{ kind: "new", displayName: "Arjun Kumar", relationship: "head_of_family" }],
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects an existing member without move intent when marked as already family-linked", () => {
    const result = devoteeRegistrationSchema.safeParse({
      devotee,
      family: {
        mode: "new",
        familyName: "Kumar Family",
        primaryRelationship: "head_of_family",
        members: [
          {
            kind: "existing",
            devoteeId: "550e8400-e29b-41d4-a716-446655440001",
            relationship: "wife",
            currentFamilyId: "550e8400-e29b-41d4-a716-446655440002",
          },
        ],
      },
    });

    expect(result.success).toBe(false);
  });
});
