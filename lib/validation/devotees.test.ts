import { describe, expect, it } from "vitest";
import { createDevoteeSchema, updateDevoteeSchema } from "./devotees";

describe("createDevoteeSchema", () => {
  const base = { whatsappPhone: "+919876543210", displayName: "Ravi Kumar" };

  it("accepts a minimal valid devotee", () => {
    const result = createDevoteeSchema.parse(base);
    expect(result.displayName).toBe("Ravi Kumar");
    expect(result.dateOfBirth).toBeUndefined();
  });

  it("accepts an explicit WhatsApp opt-in value", () => {
    const result = createDevoteeSchema.parse({ ...base, whatsappOptInStatus: false });
    expect(result.whatsappOptInStatus).toBe(false);
  });

  it("rejects a blank name", () => {
    const result = createDevoteeSchema.safeParse({ ...base, displayName: "  " });
    expect(result.success).toBe(false);
  });

  it("accepts a valid date of birth", () => {
    const result = createDevoteeSchema.parse({ ...base, dateOfBirth: "1990-05-20" });
    expect(result.dateOfBirth).toBe("1990-05-20");
  });

  it("rejects a malformed date of birth", () => {
    const result = createDevoteeSchema.safeParse({ ...base, dateOfBirth: "20/05/1990" });
    expect(result.success).toBe(false);
  });

  it("converts an empty date of birth to null", () => {
    const result = createDevoteeSchema.parse({ ...base, dateOfBirth: "" });
    expect(result.dateOfBirth).toBeNull();
  });
});

describe("updateDevoteeSchema", () => {
  it("omits untouched fields entirely so the repository leaves them unchanged", () => {
    const result = updateDevoteeSchema.parse({ displayName: "New Name" });
    expect("dateOfBirth" in result).toBe(false);
    expect("birthStar" in result).toBe(false);
  });

  it("includes an explicit null when a field is cleared", () => {
    const result = updateDevoteeSchema.parse({ birthStar: "" });
    expect("birthStar" in result).toBe(true);
    expect(result.birthStar).toBeNull();
  });

  it("accepts an explicit WhatsApp opt-out on update", () => {
    const result = updateDevoteeSchema.parse({ whatsappOptInStatus: false });
    expect(result.whatsappOptInStatus).toBe(false);
  });

  it("rejects a malformed date of birth on update", () => {
    const result = updateDevoteeSchema.safeParse({ dateOfBirth: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("rejects a future date of birth", () => {
    const result = updateDevoteeSchema.safeParse({ dateOfBirth: "2099-01-01" });
    expect(result.success).toBe(false);
  });

  it("accepts clearing whatsappPhone to an empty string — editing a devotee with no phone must not require re-entering one (regression: this previously rejected any edit of a phone-less devotee with 'Phone number is required')", () => {
    const result = updateDevoteeSchema.parse({ whatsappPhone: "", displayName: "New Name" });
    expect("whatsappPhone" in result).toBe(true);
    expect(result.whatsappPhone).toBeNull();
  });

  it("still normalizes a real whatsappPhone value on update", () => {
    const result = updateDevoteeSchema.parse({ whatsappPhone: "  +919876543210  " });
    expect(result.whatsappPhone).toBe("+919876543210");
  });
});
