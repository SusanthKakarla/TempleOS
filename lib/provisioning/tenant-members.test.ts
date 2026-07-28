import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "@/lib/db/pool";
import { createAuditLogEntry } from "@/lib/db/audit-log";
import { deactivateTenantMembership, deleteTenantMembership } from "@/lib/db/tenant-memberships";
import { setTenantMemberStatus, deleteTenantMember, type TenantAdminActor } from "./tenant-members";

vi.mock("@/lib/db/pool", () => ({ getPool: vi.fn() }));
vi.mock("@/lib/db/audit-log", () => ({ createAuditLogEntry: vi.fn() }));
vi.mock("@/lib/db/tenant-memberships", () => ({
  deactivateTenantMembership: vi.fn(),
  reactivateTenantMembership: vi.fn(),
  deleteTenantMembership: vi.fn(),
}));
vi.mock("@/lib/db/role-definitions", () => ({ listActiveRoleCodesForSuperAdmin: vi.fn() }));

const actor: TenantAdminActor = { type: "tenant_member", tenantId: "tenant-1", membershipId: "actor-membership" };

// Regression guard for the cross-tenant "last admin" oracle: the has-admin-role
// pre-check must be scoped by tenant_id, not just membership_id — otherwise a
// sole-admin attacker could submit any cross-tenant membershipId and learn,
// from the 409-vs-404 response difference, whether that id is currently an
// active admin anywhere on the platform (the mutation itself was always
// tenant-scoped and safe; this was purely an information-disclosure oracle).
describe("cross-tenant last-admin oracle regression guard", () => {
  const client = { query: vi.fn(), release: vi.fn() };

  beforeEach(() => {
    client.query.mockReset();
    client.release.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ connect: vi.fn().mockResolvedValue(client) });
    vi.mocked(deactivateTenantMembership).mockReset();
    vi.mocked(deleteTenantMembership).mockReset();
    vi.mocked(createAuditLogEntry).mockReset();
  });

  it("setTenantMemberStatus scopes the has-admin-role query by tenant_id", async () => {
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ count: "1" }] }) // countOtherActiveAdmins
      .mockResolvedValueOnce({ rows: [{ has_admin: false }] }) // has_admin — cross-tenant id never matches
      .mockResolvedValueOnce(undefined); // ROLLBACK
    vi.mocked(deactivateTenantMembership).mockResolvedValue(null); // not found in actor's tenant

    await expect(
      setTenantMemberStatus({ membershipId: "cross-tenant-membership", status: "inactive" }, actor),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });

    const hasAdminCall = client.query.mock.calls[2];
    expect(String(hasAdminCall[0])).toContain("tm.tenant_id = $2");
    expect(hasAdminCall[1]).toEqual(["cross-tenant-membership", "tenant-1"]);
  });

  it("deleteTenantMember scopes the has-admin-role query by tenant_id", async () => {
    client.query
      .mockResolvedValueOnce(undefined) // BEGIN
      .mockResolvedValueOnce({ rows: [{ has_admin: false }] }) // has_admin — cross-tenant id never matches
      .mockResolvedValueOnce(undefined); // ROLLBACK
    vi.mocked(deleteTenantMembership).mockResolvedValue(false); // not found in actor's tenant
    vi.mocked(createAuditLogEntry).mockResolvedValue({} as never);

    await expect(
      deleteTenantMember({ membershipId: "cross-tenant-membership" }, actor),
    ).rejects.toMatchObject({ code: "MEMBER_NOT_FOUND" });

    const hasAdminCall = client.query.mock.calls[1];
    expect(String(hasAdminCall[0])).toContain("tm.tenant_id = $2");
    expect(hasAdminCall[1]).toEqual(["cross-tenant-membership", "tenant-1"]);
    // The audit-log insert and the delete both run on the same transaction
    // client, so even though createAuditLogEntry is called before the
    // not-found check fails, the whole transaction (including that insert)
    // is rolled back — no misleading audit row survives for a cross-tenant
    // attempt that never actually deleted anything.
    expect(client.query).toHaveBeenLastCalledWith("ROLLBACK");
  });
});
