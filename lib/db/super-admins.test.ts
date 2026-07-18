import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import {
  bindSuperAdminFirebaseUid,
  findActiveSuperAdminByPhone,
  getSuperAdminById,
  upsertFirstSuperAdmin,
} from "./super-admins";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "super-admin-1",
  phone_number: "+14155552671",
  display_name: "Platform Admin",
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
      phoneNumber: "+1 415 555 2671",
      displayName: "Platform Admin",
    });

    expect(result).toEqual({
      id: "super-admin-1",
      phoneNumber: "+14155552671",
      displayName: "Platform Admin",
      firebaseUid: null,
      active: true,
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM super_admins WHERE active = true"),
    );
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO super_admins"), [
      "+14155552671",
      "Platform Admin",
    ]);
  });

  it("is idempotent by normalized phone and does not touch tenant tables", async () => {
    await upsertFirstSuperAdmin({
      phoneNumber: "+1 415 555 2671",
      displayName: "Platform Admin",
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
      upsertFirstSuperAdmin({ phoneNumber: "+1 415 555 2671", displayName: "Platform Admin" }),
    ).rejects.toThrow(/already exists/i);

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain("SELECT * FROM super_admins");
  });

  it("rejects invalid phone input before querying", async () => {
    await expect(
      upsertFirstSuperAdmin({ phoneNumber: "not a phone", displayName: "Platform Admin" }),
    ).rejects.toThrow(/valid phone number/i);
    expect(query).not.toHaveBeenCalled();
  });

  it("finds an active super admin by normalized phone number", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await findActiveSuperAdminByPhone("+1 415 555 2671");

    expect(result?.id).toBe("super-admin-1");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE phone_number = $1 AND active = true"),
      ["+14155552671"],
    );
  });

  it("returns null for invalid super admin phone input without querying", async () => {
    query.mockReset();

    await expect(findActiveSuperAdminByPhone("not a phone")).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });

  it("gets a super admin by id", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await getSuperAdminById("super-admin-1");

    expect(result?.phoneNumber).toBe("+14155552671");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("SELECT * FROM super_admins WHERE id = $1 LIMIT 1"),
      ["super-admin-1"],
    );
  });

  it("binds Firebase uid only when empty or already matched", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [{ id: "super-admin-1" }], rowCount: 1 });

    await expect(bindSuperAdminFirebaseUid("super-admin-1", "firebase-1")).resolves.toBe(true);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("firebase_uid IS NULL OR firebase_uid = $2"),
      ["super-admin-1", "firebase-1"],
    );
    expect(String(query.mock.calls[0][0])).toContain("NOT EXISTS");
  });

  it("rejects binding when Firebase uid belongs to another account", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(bindSuperAdminFirebaseUid("super-admin-1", "firebase-2")).resolves.toBe(false);
  });
});
