import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import {
  addSuperAdmin,
  bindSuperAdminFirebaseUid,
  deactivateSuperAdmin,
  findActiveSuperAdminByPhone,
  getSuperAdminById,
  listActiveSuperAdmins,
  upsertFirstSuperAdmin,
} from "./super-admins";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "super-admin-1",
  person_id: "person-1",
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
      personId: "person-1",
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
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO super_admins"),
      ["+14155552671", "Platform Admin"],
    );
  });

  it("is idempotent by normalized phone, links a person, and does not touch tenant tables", async () => {
    await upsertFirstSuperAdmin({
      phoneNumber: "+1 415 555 2671",
      displayName: "Platform Admin",
    });

    const sql = String(query.mock.calls[1][0]);
    expect(sql).toContain("INSERT INTO persons");
    expect(sql).toContain("ON CONFLICT (phone_number)");
    expect(sql).toContain("person_id");
    expect(sql).not.toMatch(/tenant_memberships|tenant_membership_roles/i);
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
    expect(result?.personId).toBe("person-1");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("JOIN persons p ON p.id = sa.person_id"),
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
      expect.stringContaining("JOIN persons p ON p.id = sa.person_id"),
      ["super-admin-1"],
    );
  });

  it("lists active super admins ordered by creation", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await listActiveSuperAdmins();

    expect(result).toEqual([
      {
        id: "super-admin-1",
        personId: "person-1",
        phoneNumber: "+14155552671",
        displayName: "Platform Admin",
        firebaseUid: null,
        active: true,
        createdAt: "2026-07-18T00:00:00.000Z",
        updatedAt: "2026-07-18T00:00:00.000Z",
      },
    ]);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE sa.active = true"));
  });

  it("adds an additional super admin without the single-admin guard", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await addSuperAdmin({ phoneNumber: "+1 415 555 2671", displayName: "Platform Admin" });

    expect(result.id).toBe("super-admin-1");
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT INTO super_admins"),
      ["+14155552671", "Platform Admin"],
    );
    expect(String(query.mock.calls[0][0])).not.toContain("SELECT * FROM super_admins WHERE active = true");
  });

  it("rejects adding a super admin with an invalid phone before querying", async () => {
    query.mockReset();

    await expect(addSuperAdmin({ phoneNumber: "not a phone", displayName: "New Admin" })).rejects.toThrow(
      /valid phone number/i,
    );
    expect(query).not.toHaveBeenCalled();
  });

  it("deactivates a super admin when more than one is active", async () => {
    query.mockReset();
    query
      .mockResolvedValueOnce({ rows: [row] })
      .mockResolvedValueOnce({ rows: [{ ...row, active: false }] });

    const result = await deactivateSuperAdmin("super-admin-1");

    expect(result.active).toBe(false);
    expect(String(query.mock.calls[1][0])).toContain("count(*) FROM super_admins WHERE active = true) > 1");
  });

  it("refuses to deactivate the last active super admin", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [row] }).mockResolvedValueOnce({ rows: [] });

    await expect(deactivateSuperAdmin("super-admin-1")).rejects.toThrow(/last active super admin/i);
  });

  it("refuses to deactivate a super admin that no longer exists", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [] });

    await expect(deactivateSuperAdmin("missing")).rejects.toThrow(/not found or already inactive/i);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it("binds Firebase uid on the linked person only when empty or already matched", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [{ id: "super-admin-1" }], rowCount: 1 });

    await expect(bindSuperAdminFirebaseUid("super-admin-1", "firebase-1")).resolves.toBe(true);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("p.firebase_uid IS NULL OR p.firebase_uid = $2"),
      ["super-admin-1", "firebase-1"],
    );
    expect(String(query.mock.calls[0][0])).toContain("UPDATE persons");
    expect(String(query.mock.calls[0][0])).toContain("FROM super_admins");
    expect(String(query.mock.calls[0][0])).not.toContain("UPDATE super_admins");
    expect(String(query.mock.calls[0][0])).toContain("NOT EXISTS");
  });

  it("rejects binding when Firebase uid belongs to another account", async () => {
    query.mockReset();
    query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

    await expect(bindSuperAdminFirebaseUid("super-admin-1", "firebase-2")).resolves.toBe(false);
  });
});
