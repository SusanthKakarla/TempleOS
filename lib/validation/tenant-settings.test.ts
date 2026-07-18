import { describe, expect, it } from "vitest";
import { updateTenantSettingsSchema } from "./tenant-settings";

describe("updateTenantSettingsSchema", () => {
  it("allows a partial update with just the name", () => {
    const result = updateTenantSettingsSchema.safeParse({ name: "Sri Venkateswara Temple" });
    expect(result.success).toBe(true);
  });

  it("allows an empty payload (no-op update)", () => {
    expect(updateTenantSettingsSchema.safeParse({}).success).toBe(true);
  });

  it("rejects a blank name", () => {
    expect(updateTenantSettingsSchema.safeParse({ name: "   " }).success).toBe(false);
  });

  it("converts empty optional strings to null", () => {
    const result = updateTenantSettingsSchema.parse({
      welcomeMessage: "  ",
      description: "",
      donationInfo: "",
    });
    expect(result.welcomeMessage).toBeNull();
    expect(result.description).toBeNull();
    expect(result.donationInfo).toBeNull();
  });

  it("trims donation info", () => {
    const result = updateTenantSettingsSchema.parse({ donationInfo: "  UPI: temple@upi  " });
    expect(result.donationInfo).toBe("UPI: temple@upi");
  });

  it("validates contact email format", () => {
    expect(updateTenantSettingsSchema.safeParse({ contactEmail: "not-an-email" }).success).toBe(false);
    expect(updateTenantSettingsSchema.safeParse({ contactEmail: "office@temple.org" }).success).toBe(true);
  });

  it("treats an empty contact email as null", () => {
    const result = updateTenantSettingsSchema.parse({ contactEmail: "" });
    expect(result.contactEmail).toBeNull();
  });

  it("rejects morning close before morning open", () => {
    const result = updateTenantSettingsSchema.safeParse({
      morningOpen: "12:00",
      morningClose: "06:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejects evening close before evening open", () => {
    const result = updateTenantSettingsSchema.safeParse({
      eveningOpen: "20:00",
      eveningClose: "16:00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid morning and evening ranges", () => {
    const result = updateTenantSettingsSchema.safeParse({
      morningOpen: "06:00",
      morningClose: "12:00",
      eveningOpen: "16:30",
      eveningClose: "20:30",
    });
    expect(result.success).toBe(true);
  });
});
