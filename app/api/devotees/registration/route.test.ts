import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireTenantAdminSession } from "@/lib/auth/tenant-admin";
import {
  registerDevoteeWithFamilyIntent,
  DevoteeFamilyMoveConflictError,
} from "@/lib/db/devotee-registration";
import type { SessionPayload } from "@/lib/auth/session";

vi.mock("@/lib/auth/tenant-admin", () => ({
  requireTenantAdminSession: vi.fn(),
  tenantAdminAuthResponse: (result: { status: 401 | 403; code: string }) =>
    Response.json({ error: result.code, code: result.code }, { status: result.status }),
}));

vi.mock("@/lib/db/devotee-registration", () => ({
  registerDevoteeWithFamilyIntent: vi.fn(),
  DevoteeFamilyMoveConflictError: class DevoteeFamilyMoveConflictError extends Error {
    constructor(
      message: string,
      readonly devoteeId: string,
      readonly currentFamilyId: string,
    ) {
      super(message);
    }
  },
}));

vi.mock("@/lib/auth/features", () => ({
  requireTenantFeatureApi: vi.fn().mockResolvedValue(null),
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

function postRequest(body: unknown) {
  return { json: vi.fn().mockResolvedValue(body) } as never;
}

describe("devotee registration API", () => {
  beforeEach(() => {
    vi.mocked(requireTenantAdminSession).mockReset();
    vi.mocked(registerDevoteeWithFamilyIntent).mockReset();
  });

  it("returns 401 without tenant admin auth", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
    });

    const res = await POST(postRequest({}));

    expect(res.status).toBe(401);
    expect(registerDevoteeWithFamilyIntent).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: true, session: adminSession });

    const res = await POST(postRequest({ devotee: { displayName: "" }, family: { mode: "none" } }));

    expect(res.status).toBe(400);
    expect(registerDevoteeWithFamilyIntent).not.toHaveBeenCalled();
  });

  it("registers using the session tenant only", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: true, session: adminSession });
    vi.mocked(registerDevoteeWithFamilyIntent).mockResolvedValue({ devoteeId: "devotee-1", familyId: null });

    const res = await POST(
      postRequest({
        tenantId: "attacker",
        devotee: { displayName: "Ravi Kumar", whatsappPhone: "+919876543210" },
        family: { mode: "none" },
      }),
    );

    expect(res.status).toBe(201);
    expect(registerDevoteeWithFamilyIntent).toHaveBeenCalledWith("tenant-1", {
      devotee: { displayName: "Ravi Kumar", whatsappPhone: "+919876543210" },
      family: { mode: "none" },
    });
  });

  it("returns 409 for explicit move conflicts", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: true, session: adminSession });
    vi.mocked(registerDevoteeWithFamilyIntent).mockRejectedValue(
      new DevoteeFamilyMoveConflictError("Confirm moving this devotee", "devotee-2", "family-1"),
    );

    const res = await POST(
      postRequest({
        devotee: { displayName: "Ravi Kumar", whatsappPhone: "+919876543210" },
        family: {
          mode: "new",
          familyName: "Kumar Family",
          primaryRelationship: "head_of_family",
          members: [{ kind: "existing", devoteeId: "550e8400-e29b-41d4-a716-446655440001", relationship: "wife" }],
        },
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body).toMatchObject({ devoteeId: "devotee-2", currentFamilyId: "family-1" });
  });
});
