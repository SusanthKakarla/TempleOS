import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import {
  findActiveTenantMembershipByPersonAndTenant,
  getTenantMembershipById,
} from "./tenant-memberships";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "membership-1",
  tenant_id: "tenant-1",
  person_id: "person-1",
  display_name: "Tenant Member",
  status: "active",
  role_codes: ["admin", "priest"],
  created_at: new Date("2026-07-18T00:00:00Z"),
  updated_at: new Date("2026-07-18T00:00:00Z"),
};

describe("tenant memberships repository", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("finds an active membership by person and tenant with active role codes", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await findActiveTenantMembershipByPersonAndTenant({
      personId: "person-1",
      tenantId: "tenant-1",
    });

    expect(result?.roles).toEqual(["admin", "priest"]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE tm.person_id = $1 AND tm.tenant_id = $2"),
      ["person-1", "tenant-1"],
    );
    expect(String(query.mock.calls[0][0])).toContain("rd.active = true");
  });

  it("drops role codes that are outside the V0 role vocabulary", async () => {
    query.mockResolvedValueOnce({ rows: [{ ...row, role_codes: ["admin", "owner"] }] });

    const result = await findActiveTenantMembershipByPersonAndTenant({
      personId: "person-1",
      tenantId: "tenant-1",
    });

    expect(result?.roles).toEqual(["admin"]);
  });

  it("returns null for cross-tenant or inactive membership misses", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(
      findActiveTenantMembershipByPersonAndTenant({ personId: "person-1", tenantId: "tenant-2" }),
    ).resolves.toBeNull();
  });

  it("gets an active membership by id for live session checks", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await getTenantMembershipById("membership-1");

    expect(result?.tenantId).toBe("tenant-1");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE tm.id = $1"), [
      "membership-1",
    ]);
  });
});
