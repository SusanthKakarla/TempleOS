import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { requireTenantAdminSession } from "@/lib/auth/tenant-admin";
import { listFamiliesForTenant } from "@/lib/db/devotee-families";
import type { SessionPayload } from "@/lib/auth/session";

vi.mock("@/lib/auth/tenant-admin", () => ({
  requireTenantAdminSession: vi.fn(),
  tenantAdminAuthResponse: (result: { status: 401 | 403; code: string }) =>
    Response.json({ error: result.code, code: result.code }, { status: result.status }),
}));

vi.mock("@/lib/auth/features", () => ({
  requireTenantFeatureApi: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/db/devotee-families", () => ({
  listFamiliesForTenant: vi.fn(),
  createFamilyWithMembers: vi.fn(),
  FamilyValidationError: class FamilyValidationError extends Error {},
}));

const adminSession: SessionPayload = {
  tenantId: "tenant-1",
  personId: "person-1",
  membershipId: "membership-1",
  roles: ["admin"],
  phoneNumber: "+14155552671",
  displayName: "Tenant Admin",
  exp: Date.now() + 60_000,
};

function getRequest(url = "https://svtemple.trytempleos.com/api/devotees/families") {
  return { nextUrl: new URL(url) } as never;
}

describe("devotee families API", () => {
  beforeEach(() => {
    vi.mocked(requireTenantAdminSession).mockReset();
    vi.mocked(listFamiliesForTenant).mockReset();
  });

  it("lists family summaries with search scoped to the session tenant", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: true, session: adminSession });
    vi.mocked(listFamiliesForTenant).mockResolvedValue([
      {
        id: "family-1",
        tenantId: "tenant-1",
        familyName: "Reddy Family",
        primaryDevoteeId: "devotee-1",
        address: "Ward 3",
        city: "Velpur",
        state: "AP",
        pincode: "522001",
        primaryLanguage: null,
        primaryDevoteeName: "Srinivas Reddy",
        primaryDevoteePhone: "+919876543210",
        memberCount: 5,
        memberNames: ["Lakshmi Reddy"],
        createdAt: "2026-07-31T00:00:00.000Z",
        updatedAt: "2026-07-31T00:00:00.000Z",
      },
    ]);

    const res = await GET(getRequest("https://svtemple.trytempleos.com/api/devotees/families?tenantId=attacker&search=reddy"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(listFamiliesForTenant).toHaveBeenCalledWith("tenant-1", { search: "reddy" });
    expect(body.families[0]).toMatchObject({
      familyName: "Reddy Family",
      primaryDevoteeName: "Srinivas Reddy",
      memberCount: 5,
    });
  });
});
