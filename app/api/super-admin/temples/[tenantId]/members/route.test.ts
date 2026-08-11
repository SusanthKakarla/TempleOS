import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { verifySessionToken } from "@/lib/auth/session";
import { addTenantMemberAsSuperAdmin, parseAddTenantMemberInput } from "@/lib/provisioning/temples";
import { cookies } from "next/headers";

vi.mock("@/lib/auth/super-admin-session", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  TENANT_SESSION_COOKIE_NAME: "templeos_session",
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/provisioning/temples", () => {
  class MockAddTenantMemberError extends Error {
    constructor(
      message: string,
      public readonly status: 400 | 404 | 409 | 500,
      public readonly code: string,
      public readonly errors: { path: string[]; message: string }[] = [],
    ) {
      super(message);
      this.name = "AddTenantMemberError";
    }
  }

  return {
    parseAddTenantMemberInput: vi.fn(),
    addTenantMemberAsSuperAdmin: vi.fn(),
    AddTenantMemberError: MockAddTenantMemberError,
  };
});

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const { AddTenantMemberError } = await import("@/lib/provisioning/temples");

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

const tenantId = "11111111-1111-4111-8111-111111111111";

const canonicalInput = {
  tenantId,
  displayName: "Temple Admin",
  phoneNumber: "+918886655443",
  email: null,
  roles: ["admin" as const],
};

function request(body: unknown): Request {
  return new Request(`http://localhost/api/super-admin/temples/${tenantId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function context(id = tenantId) {
  return { params: Promise.resolve({ tenantId: id }) };
}

function mockTenantCookie(value?: string): void {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) => (name === "templeos_session" && value ? { value } : undefined)),
  } as never);
}

describe("super admin add temple member route", () => {
  beforeEach(() => {
    vi.mocked(requireSuperAdmin).mockReset();
    vi.mocked(verifySessionToken).mockReset();
    vi.mocked(parseAddTenantMemberInput).mockReset();
    vi.mocked(addTenantMemberAsSuperAdmin).mockReset();
    vi.mocked(cookies).mockReset();
    mockTenantCookie();
  });

  it("adds a member for an authenticated super admin", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseAddTenantMemberInput).mockReturnValue({ ok: true, data: canonicalInput });
    vi.mocked(addTenantMemberAsSuperAdmin).mockResolvedValue({
      temple: { tenant: { id: tenantId } } as never,
      membershipId: "membership-1",
    });

    const res = await POST(
      request({ displayName: "Temple Admin", phoneNumber: "8886655443", roles: ["admin"] }) as never,
      context(),
    );

    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toMatchObject({ membershipId: "membership-1" });
    expect(addTenantMemberAsSuperAdmin).toHaveBeenCalledWith(
      canonicalInput,
      expect.objectContaining({ type: "super_admin", superAdminId: "super-admin-1" }),
    );
  });

  it("returns 401 for unauthenticated requests without adding a member", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);

    const res = await POST(request({}) as never, context());

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(addTenantMemberAsSuperAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 for a tenant admin without adding a member", async () => {
    mockTenantCookie("tenant-session-token");
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);
    vi.mocked(verifySessionToken).mockReturnValue({
      tenantId,
      personId: "person-1",
      membershipId: "membership-1",
      roles: ["admin"],
      phoneNumber: "+917000000000",
      displayName: "Tenant Admin",
      exp: Date.now() + 60_000,
    });

    const res = await POST(request({}) as never, context());

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(addTenantMemberAsSuperAdmin).not.toHaveBeenCalled();
  });

  it("rejects a non-uuid temple id before parsing the body", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await POST(request({}) as never, context("not-a-uuid"));

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toMatchObject({ code: "TEMPLE_NOT_FOUND" });
    expect(parseAddTenantMemberInput).not.toHaveBeenCalled();
  });

  it("returns field errors for invalid input", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseAddTenantMemberInput).mockReturnValue({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [{ path: ["phoneNumber"], message: "Enter a valid phone number." }],
    });

    const res = await POST(request({ phoneNumber: "nope" }) as never, context());

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      code: "VALIDATION_ERROR",
      errors: [{ path: ["phoneNumber"], message: "Enter a valid phone number." }],
    });
  });

  it("redacts validation messages that could echo user input", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseAddTenantMemberInput).mockReturnValue({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [{ path: ["displayName"], message: "String must contain at most 200 character(s) — got <script>" }],
    });

    const res = await POST(request({ displayName: "x" }) as never, context());

    await expect(res.json()).resolves.toMatchObject({
      errors: [{ path: ["displayName"], message: "Invalid field value." }],
    });
  });

  it("surfaces an already-a-member conflict as a usable message", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseAddTenantMemberInput).mockReturnValue({ ok: true, data: canonicalInput });
    vi.mocked(addTenantMemberAsSuperAdmin).mockRejectedValue(
      new AddTenantMemberError("This person is already a member of this temple.", 409, "ALREADY_MEMBER"),
    );

    const res = await POST(request({}) as never, context());

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toEqual({
      error: "This person is already a member of this temple.",
      code: "ALREADY_MEMBER",
    });
  });

  it("returns a stable 500 without leaking database details", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseAddTenantMemberInput).mockReturnValue({ ok: true, data: canonicalInput });
    vi.mocked(addTenantMemberAsSuperAdmin).mockRejectedValue(
      new Error('duplicate key value violates unique constraint "tenant_memberships_pkey"'),
    );

    const res = await POST(request({}) as never, context());

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({
      error: "Failed to add member.",
      code: "ADD_MEMBER_FAILED",
    });
  });

  it("returns 400 for invalid JSON without adding a member", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await POST(
      new Request(`http://localhost/api/super-admin/temples/${tenantId}/members`, {
        method: "POST",
        body: "{",
      }) as never,
      context(),
    );

    expect(res.status).toBe(400);
    expect(addTenantMemberAsSuperAdmin).not.toHaveBeenCalled();
  });
});
