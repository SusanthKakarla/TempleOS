import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, GET, PATCH, POST, PUT } from "./route";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { verifySessionToken } from "@/lib/auth/session";
import { listRoleDefinitionsForSuperAdmin } from "@/lib/db/role-definitions";
import { cookies } from "next/headers";

vi.mock("@/lib/auth/super-admin-session", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  TENANT_SESSION_COOKIE_NAME: "templeos_session",
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/db/role-definitions", () => ({
  listRoleDefinitionsForSuperAdmin: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const superAdmin = {
  id: "super-admin-1",
  personId: "person-1",
  phoneNumber: "+14155552671",
  displayName: "Platform Admin",
  firebaseUid: "firebase-1",
  active: true,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const roles = [
  {
    id: "role-admin",
    code: "admin" as const,
    displayName: "Admin",
    description: "Dashboard access plus tenant member and role management inside the tenant.",
    capabilitySet: { dashboardAccess: true },
    active: true,
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  },
];

function mockTenantCookie(value?: string): void {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) => (name === "templeos_session" && value ? { value } : undefined)),
  } as never);
}

describe("super admin role catalog route", () => {
  beforeEach(() => {
    vi.mocked(requireSuperAdmin).mockReset();
    vi.mocked(verifySessionToken).mockReset();
    vi.mocked(listRoleDefinitionsForSuperAdmin).mockReset();
    vi.mocked(cookies).mockReset();
    mockTenantCookie();
  });

  it("lists fixed V0 roles for an authenticated super admin", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(listRoleDefinitionsForSuperAdmin).mockResolvedValue(roles);

    const res = await GET();

    await expect(res.json()).resolves.toEqual({ roles });
    expect(res.status).toBe(200);
    expect(listRoleDefinitionsForSuperAdmin).toHaveBeenCalledOnce();
  });

  it("returns 401 without reading roles when no super-admin session exists", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);

    const res = await GET();

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
    expect(listRoleDefinitionsForSuperAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 without reading roles for tenant-admin-only sessions", async () => {
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

    const res = await GET();

    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(res.status).toBe(403);
    expect(listRoleDefinitionsForSuperAdmin).not.toHaveBeenCalled();
  });

  it("returns a leak-safe 500 when the role catalog read fails", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(listRoleDefinitionsForSuperAdmin).mockRejectedValue(
      new Error("database stack trace with tenant-1"),
    );

    const res = await GET();

    await expect(res.json()).resolves.toEqual({
      error: "Role catalog failed.",
      code: "ROLE_CATALOG_FAILED",
    });
    expect(res.status).toBe(500);
  });

  it("returns a leak-safe 500 when the super-admin auth read fails", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValue(
      new Error("database stack trace with session secret"),
    );

    const res = await GET();

    await expect(res.json()).resolves.toEqual({
      error: "Role catalog failed.",
      code: "ROLE_CATALOG_FAILED",
    });
    expect(res.status).toBe(500);
    expect(listRoleDefinitionsForSuperAdmin).not.toHaveBeenCalled();
  });

  it.each([
    ["POST", POST],
    ["PUT", PUT],
    ["PATCH", PATCH],
    ["DELETE", DELETE],
  ])("rejects custom role mutation via %s as deferred in V0", async (_method, handler) => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await handler();

    await expect(res.json()).resolves.toEqual({
      error: "Custom tenant-local roles are deferred.",
      code: "CUSTOM_ROLES_DEFERRED",
    });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("GET");
    expect(listRoleDefinitionsForSuperAdmin).not.toHaveBeenCalled();
  });
});
