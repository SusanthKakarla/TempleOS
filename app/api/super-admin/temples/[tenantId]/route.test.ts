import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { verifySessionToken } from "@/lib/auth/session";
import { getTenantDetailForSuperAdmin } from "@/lib/db/tenants";
import { cookies } from "next/headers";

vi.mock("@/lib/auth/super-admin-session", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  TENANT_SESSION_COOKIE_NAME: "templeos_session",
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/db/tenants", () => ({
  getTenantDetailForSuperAdmin: vi.fn(),
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

const templeDetail = {
  tenant: {
    id: tenantId,
    slug: "sv-temple",
    name: "Sri Venkateswara Temple",
    defaultContactPhone: "+14155552671",
    address: "1 Temple Way",
    timezone: "America/Los_Angeles",
    welcomeMessage: null,
    description: null,
    history: null,
    contactEmail: null,
    googleMapsLink: null,
    morningOpen: null,
    morningClose: null,
    eveningOpen: null,
    eveningClose: null,
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T08:00:00.000Z",
  },
  domain: {
    id: "domain-1",
    tenantId: "tenant-1",
    hostname: "svtemple.trytempleos.com",
    kind: "primary" as const,
    status: "active" as const,
    createdAt: "2026-07-18T00:10:00.000Z",
    updatedAt: "2026-07-18T00:10:00.000Z",
  },
  members: [
    {
      id: "membership-1",
      tenantId: "tenant-1",
      personId: "person-1",
      displayName: "Temple Admin",
      phoneNumber: "+14155552672",
      status: "active" as const,
      roles: ["admin" as const],
      createdAt: "2026-07-18T00:20:00.000Z",
      updatedAt: "2026-07-18T08:10:00.000Z",
    },
  ],
  whatsappAccount: null,
};

function request(id = tenantId): Request {
  return new Request(`http://localhost/api/super-admin/temples/${id}`);
}

function context(id = tenantId) {
  return {
    params: Promise.resolve({ tenantId: id }),
  };
}

function mockTenantCookie(value?: string): void {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) => (name === "templeos_session" && value ? { value } : undefined)),
  } as never);
}

describe("super admin temple detail route", () => {
  beforeEach(() => {
    vi.mocked(requireSuperAdmin).mockReset();
    vi.mocked(verifySessionToken).mockReset();
    vi.mocked(getTenantDetailForSuperAdmin).mockReset();
    vi.mocked(cookies).mockReset();
    mockTenantCookie();
  });

  it("returns temple detail for an authenticated super admin", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(getTenantDetailForSuperAdmin).mockResolvedValue(templeDetail);

    const res = await GET(request() as never, context());

    await expect(res.json()).resolves.toEqual({ temple: templeDetail });
    expect(res.status).toBe(200);
    expect(getTenantDetailForSuperAdmin).toHaveBeenCalledWith(tenantId);
  });

  it("returns 404 when the tenant does not exist", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(getTenantDetailForSuperAdmin).mockResolvedValue(null);

    const missingTenantId = "22222222-2222-4222-8222-222222222222";
    const res = await GET(request(missingTenantId) as never, context(missingTenantId));

    await expect(res.json()).resolves.toEqual({
      error: "Temple not found.",
      code: "TEMPLE_NOT_FOUND",
    });
    expect(res.status).toBe(404);
  });

  it("returns 404 for malformed tenant IDs without reading tenant detail", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await GET(request("not-a-uuid") as never, context("not-a-uuid"));

    await expect(res.json()).resolves.toEqual({
      error: "Temple not found.",
      code: "TEMPLE_NOT_FOUND",
    });
    expect(res.status).toBe(404);
    expect(getTenantDetailForSuperAdmin).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated detail requests without reading tenant detail", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);

    const res = await GET(request() as never, context());

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
    expect(getTenantDetailForSuperAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 for tenant-admin detail requests without reading tenant detail", async () => {
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

    const res = await GET(request() as never, context());

    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(res.status).toBe(403);
    expect(getTenantDetailForSuperAdmin).not.toHaveBeenCalled();
  });

  it("returns a stable 500 when the super-admin detail read fails", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(getTenantDetailForSuperAdmin).mockRejectedValue(
      new Error("database stack trace with unrelated tenant details"),
    );

    const res = await GET(request() as never, context());

    await expect(res.json()).resolves.toEqual({
      error: "Temple detail failed.",
      code: "TEMPLE_DETAIL_FAILED",
    });
    expect(res.status).toBe(500);
  });
});
