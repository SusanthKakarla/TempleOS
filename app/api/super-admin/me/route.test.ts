import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { verifySessionToken } from "@/lib/auth/session";
import { cookies } from "next/headers";

vi.mock("@/lib/auth/super-admin-session", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  TENANT_SESSION_COOKIE_NAME: "templeos_session",
  verifySessionToken: vi.fn(),
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

function mockTenantCookie(value?: string): void {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) => (name === "templeos_session" && value ? { value } : undefined)),
  } as never);
}

describe("super admin me route", () => {
  beforeEach(() => {
    vi.mocked(requireSuperAdmin).mockReset();
    vi.mocked(verifySessionToken).mockReset();
    vi.mocked(cookies).mockReset();
    mockTenantCookie();
  });

  it("returns the current super admin when the super admin session is valid", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await GET();

    await expect(res.json()).resolves.toEqual({
      superAdmin: {
        id: "super-admin-1",
        phoneNumber: "+14155552671",
        displayName: "Platform Admin",
      },
    });
    expect(res.status).toBe(200);
  });

  it("returns 401 when no valid super admin session exists", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);

    const res = await GET();

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when a tenant session exists without super admin privilege", async () => {
    mockTenantCookie("tenant-session-token");
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);
    vi.mocked(verifySessionToken).mockReturnValue({
      adminId: "admin-1",
      tenantId: "tenant-1",
      phoneNumber: "+917000000000",
      displayName: "Tenant Admin",
      exp: Date.now() + 60_000,
    });

    const res = await GET();

    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(res.status).toBe(403);
  });

  it("returns 401 when only an invalid tenant cookie is present", async () => {
    mockTenantCookie("invalid-token");
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);
    vi.mocked(verifySessionToken).mockReturnValue(null);

    const res = await GET();

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
  });
});
