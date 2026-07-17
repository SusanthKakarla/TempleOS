import { describe, expect, it } from "vitest";
import { createAdminSchema, updateAdminRoleSchema } from "./admins";

describe("createAdminSchema", () => {
  it("accepts a valid admin", () => {
    const result = createAdminSchema.safeParse({
      phoneNumber: "+919876543210",
      displayName: "Priya",
      role: "admin",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a blank name", () => {
    const result = createAdminSchema.safeParse({
      phoneNumber: "+919876543210",
      displayName: "  ",
      role: "admin",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid role", () => {
    const result = createAdminSchema.safeParse({
      phoneNumber: "+919876543210",
      displayName: "Priya",
      role: "owner",
    });
    expect(result.success).toBe(false);
  });
});

describe("updateAdminRoleSchema", () => {
  it("accepts super_admin and admin", () => {
    expect(updateAdminRoleSchema.safeParse({ role: "super_admin" }).success).toBe(true);
    expect(updateAdminRoleSchema.safeParse({ role: "admin" }).success).toBe(true);
  });

  it("rejects anything else", () => {
    expect(updateAdminRoleSchema.safeParse({ role: "tenant_admin" }).success).toBe(false);
  });
});
