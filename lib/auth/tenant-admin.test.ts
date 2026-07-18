import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSessionAdmin } from "./session";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "./tenant-admin";
import type { SessionPayload } from "./session";

vi.mock("./session", () => ({
  getSessionAdmin: vi.fn(),
}));

const baseSession: SessionPayload = {
  tenantId: "tenant-1",
  personId: "person-1",
  membershipId: "membership-1",
  roles: ["admin"],
  phoneNumber: "+14155552671",
  displayName: "Tenant Admin",
  exp: Date.now() + 60_000,
};

describe("tenant admin authorization", () => {
  beforeEach(() => {
    vi.mocked(getSessionAdmin).mockReset();
  });

  it("allows active memberships with the admin role", async () => {
    vi.mocked(getSessionAdmin).mockResolvedValue({ ...baseSession, roles: ["admin", "priest"] });

    await expect(requireTenantAdminSession()).resolves.toEqual({
      ok: true,
      session: { ...baseSession, roles: ["admin", "priest"] },
    });
  });

  it.each([
    { roles: ["priest"] },
    { roles: ["committee_member"] },
    { roles: ["volunteer"] },
    { roles: ["devotee"] },
    { roles: [] },
  ])("denies active memberships without admin role: $roles", async ({ roles }) => {
      vi.mocked(getSessionAdmin).mockResolvedValue({
        ...baseSession,
        roles: roles as SessionPayload["roles"],
      });

      await expect(requireTenantAdminSession()).resolves.toEqual({
        ok: false,
        status: 403,
        code: "TENANT_ADMIN_REQUIRED",
      });
  });

  it("returns 401 when no live tenant session exists", async () => {
    vi.mocked(getSessionAdmin).mockResolvedValue(null);

    const result = await requireTenantAdminSession();

    expect(result).toEqual({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
    });
    if (result.ok) {
      throw new Error("Expected missing tenant session to be denied");
    }
    const response = tenantAdminAuthResponse(result);
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("returns a 403 response for authenticated non-admin members", async () => {
    const response = tenantAdminAuthResponse({
      ok: false,
      status: 403,
      code: "TENANT_ADMIN_REQUIRED",
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({ code: "TENANT_ADMIN_REQUIRED" });
  });
});
