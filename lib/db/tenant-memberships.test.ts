import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import {
  assignTenantMembershipRolesForProvisioning,
  getTenantMembershipByTenantAndIdForSuperAdmin,
  replaceTenantMembershipRolesForSuperAdmin,
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

  it("fails provisioning role assignment when any requested role is not active in the database", async () => {
    query
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...row, role_codes: ["admin"] }] });

    await expect(
      assignTenantMembershipRolesForProvisioning(
        { membershipId: "membership-1", roles: ["admin", "priest"] },
        { query },
      ),
    ).rejects.toThrow("Provisioning role assignment incomplete.");
  });

  it("gets an active membership by tenant and id for super-admin scoped mutations", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await getTenantMembershipByTenantAndIdForSuperAdmin(
      { tenantId: "tenant-1", membershipId: "membership-1" },
      { query },
    );

    expect(result?.tenantId).toBe("tenant-1");
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE tm.tenant_id = $1 AND tm.id = $2 AND tm.status = 'active'"),
      ["tenant-1", "membership-1"],
    );
  });

  it("returns null for cross-tenant super-admin membership targets", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(
      getTenantMembershipByTenantAndIdForSuperAdmin(
        { tenantId: "tenant-1", membershipId: "membership-from-tenant-2" },
        { query },
      ),
    ).resolves.toBeNull();
  });

  it("replaces one membership's roles with active role definitions only", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: "membership-1" }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 2 })
      .mockResolvedValueOnce({ rows: [{ ...row, role_codes: ["admin", "volunteer"] }] });

    const result = await replaceTenantMembershipRolesForSuperAdmin(
      { tenantId: "tenant-1", membershipId: "membership-1", roles: ["admin", "volunteer"] },
      { query },
    );

    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("FOR UPDATE"), [
      "tenant-1",
      "membership-1",
    ]);
    expect(query).toHaveBeenNthCalledWith(2, expect.stringContaining("DELETE FROM tenant_membership_roles"), [
      "membership-1",
    ]);
    expect(query).toHaveBeenNthCalledWith(3, expect.stringContaining("WHERE active = true AND code = ANY($2::text[])"), [
      "membership-1",
      ["admin", "volunteer"],
    ]);
    expect(result.roles).toEqual(["admin", "volunteer"]);
  });

  it("does not replace roles when the membership is inactive or outside the tenant", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(
      replaceTenantMembershipRolesForSuperAdmin(
        { tenantId: "tenant-1", membershipId: "membership-from-tenant-2", roles: ["admin"] },
        { query },
      ),
    ).rejects.toThrow("Super-admin role assignment target is not active in the requested tenant.");

    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("FOR UPDATE"), [
      "tenant-1",
      "membership-from-tenant-2",
    ]);
  });

  it("uses tenant plus membership identity instead of person identity for same-person role replacement", async () => {
    const tenantBMembershipId = "tenant-b-membership";
    const sharedPersonId = "shared-person";

    query
      .mockResolvedValueOnce({ rows: [{ id: "tenant-a-membership" }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({
        rows: [
          {
            ...row,
            id: "tenant-a-membership",
            tenant_id: "tenant-a",
            person_id: sharedPersonId,
            role_codes: ["admin"],
          },
        ],
      });

    await replaceTenantMembershipRolesForSuperAdmin(
      { tenantId: "tenant-a", membershipId: "tenant-a-membership", roles: ["admin"] },
      { query },
    );

    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("WHERE tenant_id = $1 AND id = $2"), [
      "tenant-a",
      "tenant-a-membership",
    ]);
    expect(String(query.mock.calls[0][0])).not.toContain("person_id");
    expect(query).toHaveBeenNthCalledWith(2, expect.any(String), ["tenant-a-membership"]);
    expect(query).toHaveBeenNthCalledWith(3, expect.any(String), ["tenant-a-membership", ["admin"]]);
    expect(query).toHaveBeenNthCalledWith(4, expect.stringContaining("WHERE tm.tenant_id = $1 AND tm.id = $2"), [
      "tenant-a",
      "tenant-a-membership",
    ]);

    const calledArguments = JSON.stringify(query.mock.calls.map(([, params]) => params));
    expect(calledArguments).not.toContain(tenantBMembershipId);
    expect(calledArguments).not.toContain(sharedPersonId);
  });

  it("fails replacement when a requested role is inactive or missing", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: "membership-1" }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...row, role_codes: ["admin"] }] });

    await expect(
      replaceTenantMembershipRolesForSuperAdmin(
        { tenantId: "tenant-1", membershipId: "membership-1", roles: ["admin", "priest"] },
        { query },
      ),
    ).rejects.toThrow("Super-admin role assignment incomplete.");
  });

  it("treats duplicate replacement role codes as idempotent", async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: "membership-1" }] })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...row, role_codes: ["admin"] }] });

    const result = await replaceTenantMembershipRolesForSuperAdmin(
      { tenantId: "tenant-1", membershipId: "membership-1", roles: ["admin", "admin"] },
      { query },
    );

    expect(query).toHaveBeenNthCalledWith(3, expect.any(String), ["membership-1", ["admin"]]);
    expect(result.roles).toEqual(["admin"]);
  });
});
