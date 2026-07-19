import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH } from "./route";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { verifySessionToken } from "@/lib/auth/session";
import { getTenantDetailForSuperAdmin } from "@/lib/db/tenants";
import {
  parseUpdateProvisionedTempleInput,
  updateProvisionedTemple,
  UpdateProvisionedTempleError,
} from "@/lib/provisioning/temples";
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

vi.mock("@/lib/provisioning/temples", () => ({
  parseUpdateProvisionedTempleInput: vi.fn(),
  updateProvisionedTemple: vi.fn(),
  UpdateProvisionedTempleError: class UpdateProvisionedTempleError extends Error {
    constructor(
      message: string,
      public readonly status: 400 | 404 | 500,
      public readonly code: "VALIDATION_ERROR" | "TEMPLE_NOT_FOUND" | "TEMPLE_UPDATE_FAILED",
      public readonly errors = [],
    ) {
      super(message);
      this.name = "UpdateProvisionedTempleError";
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
  whatsappAccount: {
    id: "whatsapp-1",
    tenantId,
    phoneNumber: "+14155552673",
    metaPhoneNumberId: "meta-phone-1",
    metaBusinessAccountId: "meta-business-1",
    status: "connected" as const,
    connectedAt: "2026-07-18T00:30:00.000Z",
    createdAt: "2026-07-18T00:30:00.000Z",
    updatedAt: "2026-07-18T08:20:00.000Z",
  },
};

const activeOperationTempleDetail = {
  tenant: templeDetail.tenant,
  domain: templeDetail.domain,
  members: templeDetail.members,
};

function request(id = tenantId): Request {
  return new Request(`http://localhost/api/super-admin/temples/${id}`);
}

function patchRequest(body: unknown, id = tenantId): Request {
  return new Request(`http://localhost/api/super-admin/temples/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
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
    vi.mocked(parseUpdateProvisionedTempleInput).mockReset();
    vi.mocked(updateProvisionedTemple).mockReset();
    vi.mocked(cookies).mockReset();
    mockTenantCookie();
    vi.mocked(parseUpdateProvisionedTempleInput).mockReturnValue({
      ok: true,
      data: {
        tenantId,
        tenant: {
          name: "Updated Temple",
          defaultContactPhone: "+14155559999",
          address: null,
          timezone: "Asia/Kolkata",
        },
      },
    });
    vi.mocked(updateProvisionedTemple).mockResolvedValue(templeDetail);
  });

  it("returns temple detail for an authenticated super admin", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(getTenantDetailForSuperAdmin).mockResolvedValue(templeDetail);

    const res = await GET(request() as never, context());

    const body = await res.json();
    expect(body).toEqual({ temple: activeOperationTempleDetail });
    expect(JSON.stringify(body)).not.toMatch(
      /whatsappAccount|metaPhoneNumberId|metaBusinessAccountId|connected|linked|unlinked/i,
    );
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

  it("patches safe temple detail fields for an authenticated super admin", async () => {
    const updateBody = {
      tenant: {
        name: "Updated Temple",
        defaultContactPhone: "+1 415 555 9999",
        address: null,
        timezone: "Asia/Kolkata",
      },
    };
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await PATCH(patchRequest(updateBody) as never, context());

    const body = await res.json();
    expect(body).toEqual({ temple: activeOperationTempleDetail });
    expect(JSON.stringify(body)).not.toMatch(
      /whatsappAccount|metaPhoneNumberId|metaBusinessAccountId|connected|linked|unlinked/i,
    );
    expect(res.status).toBe(200);
    expect(parseUpdateProvisionedTempleInput).toHaveBeenCalledWith(updateBody, tenantId);
    expect(updateProvisionedTemple).toHaveBeenCalledWith(
      {
        tenantId,
        tenant: {
          name: "Updated Temple",
          defaultContactPhone: "+14155559999",
          address: null,
          timezone: "Asia/Kolkata",
        },
      },
      {
        type: "super_admin",
        superAdminId: "super-admin-1",
        phoneNumber: "+14155552671",
        displayName: "Platform Admin",
      },
    );
  });

  it("returns 401 for unauthenticated patch requests before parsing body", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);

    const res = await PATCH(patchRequest({ tenant: { name: "Updated" } }) as never, context());

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
    expect(parseUpdateProvisionedTempleInput).not.toHaveBeenCalled();
    expect(updateProvisionedTemple).not.toHaveBeenCalled();
  });

  it("returns a stable 500 when super-admin lookup fails before parsing body", async () => {
    vi.mocked(requireSuperAdmin).mockRejectedValueOnce(
      new Error("session database stack trace"),
    );

    const res = await PATCH(patchRequest({ tenant: { name: "Updated" } }) as never, context());

    await expect(res.json()).resolves.toEqual({
      error: "Temple update failed.",
      code: "TEMPLE_UPDATE_FAILED",
    });
    expect(res.status).toBe(500);
    expect(parseUpdateProvisionedTempleInput).not.toHaveBeenCalled();
    expect(updateProvisionedTemple).not.toHaveBeenCalled();
  });

  it("returns 403 for tenant-admin patch requests before parsing body", async () => {
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

    const res = await PATCH(patchRequest({ tenant: { name: "Updated" } }) as never, context());

    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(res.status).toBe(403);
    expect(parseUpdateProvisionedTempleInput).not.toHaveBeenCalled();
    expect(updateProvisionedTemple).not.toHaveBeenCalled();
  });

  it("returns 404 for malformed patch tenant IDs without calling the update service", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await PATCH(patchRequest({ tenant: { name: "Updated" } }, "not-a-uuid") as never, context("not-a-uuid"));

    await expect(res.json()).resolves.toMatchObject({ code: "TEMPLE_NOT_FOUND" });
    expect(res.status).toBe(404);
    expect(parseUpdateProvisionedTempleInput).not.toHaveBeenCalled();
    expect(updateProvisionedTemple).not.toHaveBeenCalled();
  });

  it("returns field-specific 400 validation errors for invalid update input", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseUpdateProvisionedTempleInput).mockReturnValueOnce({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [
        { path: ["tenant", "defaultContactPhone"], message: "Enter a valid phone number." },
        { path: ["tenant", "slug"], message: "Field is not editable in this operation." },
      ],
    });

    const res = await PATCH(
      patchRequest({ tenant: { defaultContactPhone: "123", slug: "blocked" } }) as never,
      context(),
    );

    await expect(res.json()).resolves.toEqual({
      error: "Invalid temple update request",
      code: "VALIDATION_ERROR",
      errors: [
        { path: ["tenant", "defaultContactPhone"], message: "Enter a valid phone number." },
        { path: ["tenant", "slug"], message: "Field is not editable in this operation." },
      ],
    });
    expect(res.status).toBe(400);
    expect(updateProvisionedTemple).not.toHaveBeenCalled();
  });

  it("returns a validation error for invalid JSON patch bodies", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    const badReq = new Request(`http://localhost/api/super-admin/temples/${tenantId}`, {
      method: "PATCH",
      body: "{",
    });

    const res = await PATCH(badReq as never, context());

    await expect(res.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
      errors: [{ path: ["tenant"], message: "Invalid JSON body." }],
    });
    expect(res.status).toBe(400);
    expect(parseUpdateProvisionedTempleInput).not.toHaveBeenCalled();
  });

  it("returns 404 when the update service reports a missing tenant", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(updateProvisionedTemple).mockRejectedValueOnce(
      new UpdateProvisionedTempleError("Temple not found.", 404, "TEMPLE_NOT_FOUND"),
    );

    const res = await PATCH(patchRequest({ tenant: { name: "Updated" } }) as never, context());

    await expect(res.json()).resolves.toEqual({
      error: "Temple not found.",
      code: "TEMPLE_NOT_FOUND",
    });
    expect(res.status).toBe(404);
  });

  it("returns a stable 500 when the update service fails", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(updateProvisionedTemple).mockRejectedValueOnce(
      new Error("database stack trace with unrelated tenant details"),
    );

    const res = await PATCH(patchRequest({ tenant: { name: "Updated" } }) as never, context());

    await expect(res.json()).resolves.toEqual({
      error: "Temple update failed.",
      code: "TEMPLE_UPDATE_FAILED",
    });
    expect(res.status).toBe(500);
  });
});
