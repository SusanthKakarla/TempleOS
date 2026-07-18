import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { upsertFirstSuperAdmin } from "./super-admins";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "super-admin-1",
  phone_number: "+917995362200",
  display_name: "susanth",
  firebase_uid: null,
  active: true,
  created_at: new Date("2026-07-18T00:00:00Z"),
  updated_at: new Date("2026-07-18T00:00:00Z"),
};

describe("super-admin bootstrap repository", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    query
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [row] });
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("normalizes phone input and upserts an active super_admins row", async () => {
    const result = await upsertFirstSuperAdmin({
      phoneNumber: "+91 7995362200",
      displayName: "susanth",
    });

    expect(result).toEqual({
      id: "super-admin-1",
      phoneNumber: "+917995362200",
      displayName: "susanth",
      firebaseUid: null,
      active: true,
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM super_admins WHERE active = true"),
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO super_admins"), [
      "+917995362200",
      "susanth",
    ]);
  });

  it("is idempotent by normalized phone and does not touch tenant tables", async () => {
    await upsertFirstSuperAdmin({
      phoneNumber: "+91 7995362200",
      displayName: "susanth",
    });

    const sql = String(query.mock.calls[1][0]);
    expect(sql).toContain("ON CONFLICT (phone_number)");
    expect(sql).toContain("DO UPDATE SET");
    expect(sql).not.toMatch(/persons|tenant_memberships|tenant_membership_roles/i);
  });

  it("rejects a different active existing super admin", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({
      rows: [{ ...row, phone_number: "+919999999999", display_name: "Existing Admin" }],
    });

    await expect(
      upsertFirstSuperAdmin({ phoneNumber: "+91 7995362200", displayName: "susanth" }),
    ).rejects.toThrow(/already exists/i);

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain("SELECT * FROM super_admins");
  });

  it("rejects invalid phone input before querying", async () => {
    await expect(
      upsertFirstSuperAdmin({ phoneNumber: "not a phone", displayName: "susanth" }),
    ).rejects.toThrow(/valid phone number/i);
    expect(query).not.toHaveBeenCalled();
  });
});
