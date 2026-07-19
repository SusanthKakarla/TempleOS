import { beforeEach, describe, expect, it, vi } from "vitest";
import { PUT } from "./route";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { verifySessionToken } from "@/lib/auth/session";
import {
  assignTenantMemberRoles,
  AssignTenantMemberRolesError,
  parseAssignTenantMemberRolesInput,
} from "@/lib/provisioning/temples";
import { cookies } from "next/headers";

vi.mock("@/lib/auth/super-admin-session", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  TENANT_SESSION_COOKIE_NAME: "templeos_session",
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/provisioning/temples", () => ({
  assignTenantMemberRoles: vi.fn(),
  parseAssignTenantMemberRolesInput: vi.fn(),
  AssignTenantMemberRolesError: class AssignTenantMemberRolesError extends Error {
    constructor(
      message: string,
      public readonly status: 400 | 404 | 500,
      public readonly code: "VALIDATION_ERROR" | "MEMBER_NOT_FOUND" | "ROLE_ASSIGNMENT_FAILED",
      public readonly errors = [],
    ) {
      super(message);
      this.name = "AssignTenantMemberRolesError";
    }
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const superAdmin = {
  id: "super-admin-1",
  phoneNumber: "+14155552671",
  displayName: "Platform Admin",
  firebaseUid: "firebase-1",
  active: true,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const tenantId = "11111111-1111-4111-8111-111111111111";
const membershipId = "22222222-2222-4222-8222-222222222222";

const temple = {
  tenant: { id: tenantId, name: "Temple" },
  members: [{ id: membershipId, tenantId, roles: ["admin", "volunteer"] }],
};

function request(body: unknown, id = tenantId, memberId = membershipId): Request {
  return new Request(
    `http://localhost/api/super-admin/temples/${id}/members/${memberId}/roles`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

function context(id = tenantId, memberId = membershipId) {
  return {
    params: Promise.resolve({ tenantId: id, membershipId: memberId }),
  };
}

function mockTenantCookie(value?: string): void {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) => (name === "templeos_session" && value ? { value } : undefined)),
  } as never);
}

describe("super admin tenant member role assignment route", () => {
  beforeEach(() => {
    vi.mocked(requireSuperAdmin).mockReset();
    vi.mocked(verifySessionToken).mockReset();
    vi.mocked(parseAssignTenantMemberRolesInput).mockReset();
    vi.mocked(assignTenantMemberRoles).mockReset();
    vi.mocked(cookies).mockReset();
    mockTenantCookie();
    vi.mocked(parseAssignTenantMemberRolesInput).mockReturnValue({
      ok: true,
      data: { tenantId, membershipId, roles: ["admin", "volunteer"] },
    });
    vi.mocked(assignTenantMemberRoles).mockResolvedValue(temple as never);
  });

  it("assigns roles for an authenticated super admin", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    const body = { roles: ["admin", "volunteer"] };

    const res = await PUT(request(body) as never, context());

    await expect(res.json()).resolves.toEqual({ temple });
    expect(res.status).toBe(200);
    expect(parseAssignTenantMemberRolesInput).toHaveBeenCalledWith(body, tenantId, membershipId);
    expect(assignTenantMemberRoles).toHaveBeenCalledWith(
      { tenantId, membershipId, roles: ["admin", "volunteer"] },
      {
        type: "super_admin",
        superAdminId: "super-admin-1",
        phoneNumber: "+14155552671",
        displayName: "Platform Admin",
      },
    );
  });

  it("returns 401 for unauthenticated requests before parsing body", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);

    const res = await PUT(request({ roles: ["admin"] }) as never, context());

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
    expect(parseAssignTenantMemberRolesInput).not.toHaveBeenCalled();
    expect(assignTenantMemberRoles).not.toHaveBeenCalled();
  });

  it("returns 403 for tenant-admin requests before parsing body", async () => {
    mockTenantCookie("tenant-session-token");
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);
    vi.mocked(verifySessionToken).mockReturnValue({
      tenantId: "tenant-1",
      personId: "person-1",
      membershipId: "membership-1",
      roles: ["admin"],
      phoneNumber: "+917000000000",
      displayName: "Tenant Admin",
      exp: Date.now() + 60_000,
    });

    const res = await PUT(request({ roles: ["admin"] }) as never, context());

    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(res.status).toBe(403);
    expect(parseAssignTenantMemberRolesInput).not.toHaveBeenCalled();
    expect(assignTenantMemberRoles).not.toHaveBeenCalled();
  });

  it("returns a stable 500 when super-admin lookup fails before parsing body", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(new Error("session database stack trace"));

    const res = await PUT(request({ roles: ["admin"] }) as never, context());

    await expect(res.json()).resolves.toEqual({
      error: "Role assignment failed.",
      code: "ROLE_ASSIGNMENT_FAILED",
    });
    expect(res.status).toBe(500);
    expect(parseAssignTenantMemberRolesInput).not.toHaveBeenCalled();
    expect(assignTenantMemberRoles).not.toHaveBeenCalled();
  });

  it("returns field-specific 400 validation errors", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseAssignTenantMemberRolesInput).mockReturnValueOnce({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [{ path: ["roles"], message: "Unknown role code: owner" }],
    });

    const res = await PUT(request({ roles: ["owner"] }) as never, context());

    await expect(res.json()).resolves.toEqual({
      error: "Invalid role assignment request",
      code: "VALIDATION_ERROR",
      errors: [{ path: ["roles"], message: "Unknown role code: owner" }],
    });
    expect(res.status).toBe(400);
    expect(assignTenantMemberRoles).not.toHaveBeenCalled();
  });

  it("returns a validation error for invalid JSON bodies", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    const badReq = new Request(
      `http://localhost/api/super-admin/temples/${tenantId}/members/${membershipId}/roles`,
      { method: "PUT", body: "{" },
    );

    const res = await PUT(badReq as never, context());

    await expect(res.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
      errors: [{ path: ["roles"], message: "Invalid JSON body." }],
    });
    expect(res.status).toBe(400);
    expect(parseAssignTenantMemberRolesInput).not.toHaveBeenCalled();
  });

  it("returns leak-safe 404 for malformed route IDs before parsing the body", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await PUT(
      request({ roles: ["admin"] }, "not-a-uuid", membershipId) as never,
      context("not-a-uuid", membershipId),
    );

    await expect(res.json()).resolves.toEqual({
      error: "Member not found.",
      code: "MEMBER_NOT_FOUND",
    });
    expect(res.status).toBe(404);
    expect(parseAssignTenantMemberRolesInput).not.toHaveBeenCalled();
    expect(assignTenantMemberRoles).not.toHaveBeenCalled();
  });

  it("returns 404 when the service reports a missing member", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(assignTenantMemberRoles).mockRejectedValueOnce(
      new AssignTenantMemberRolesError("Member not found.", 404, "MEMBER_NOT_FOUND"),
    );

    const res = await PUT(request({ roles: ["admin"] }) as never, context());

    await expect(res.json()).resolves.toEqual({
      error: "Member not found.",
      code: "MEMBER_NOT_FOUND",
    });
    expect(res.status).toBe(404);
  });

  it("returns a stable 500 when assignment fails", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(assignTenantMemberRoles).mockRejectedValueOnce(
      new Error("database stack trace with unrelated tenant details"),
    );

    const res = await PUT(request({ roles: ["admin"] }) as never, context());

    await expect(res.json()).resolves.toEqual({
      error: "Role assignment failed.",
      code: "ROLE_ASSIGNMENT_FAILED",
    });
    expect(res.status).toBe(500);
  });
});
