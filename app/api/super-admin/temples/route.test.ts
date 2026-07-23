import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { verifySessionToken } from "@/lib/auth/session";
import { listTenantsForSuperAdmin } from "@/lib/db/tenants";
import {
  parseProvisionTempleInput,
  provisionTemple,
  ProvisionTempleError,
} from "@/lib/provisioning/temples";
import { cookies } from "next/headers";

vi.mock("@/lib/auth/super-admin-session", () => ({
  requireSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  TENANT_SESSION_COOKIE_NAME: "templeos_session",
  verifySessionToken: vi.fn(),
}));

vi.mock("@/lib/provisioning/temples", () => {
  class MockProvisionTempleError extends Error {
    constructor(
      message: string,
      public readonly status: 400 | 409 | 500,
      public readonly code: "VALIDATION_ERROR" | "PROVISIONING_CONFLICT" | "PROVISIONING_FAILED",
      public readonly field?: string,
    ) {
      super(message);
      this.name = "ProvisionTempleError";
    }
  }

  return {
    parseProvisionTempleInput: vi.fn(),
    provisionTemple: vi.fn(),
    ProvisionTempleError: MockProvisionTempleError,
  };
});

vi.mock("@/lib/db/tenants", () => ({
  listTenantsForSuperAdmin: vi.fn(),
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

const rawProvisioningInput = {
  tenant: {
    name: "Sri Venkateswara Temple",
    slug: "sv-temple",
    defaultContactPhone: "+1 415 555 2671",
    address: "1 Temple Way",
    timezone: "America/Los_Angeles",
  },
  domain: {
    subdomain: "svtemple",
  },
  firstMember: {
    phoneNumber: "+1 415 555 2672",
    displayName: "Temple Admin",
    roles: ["admin"],
  },
  whatsappAccount: {
    phoneNumber: "+1 415 555 2673",
    metaPhoneNumberId: "meta-phone-1",
    metaBusinessAccountId: "meta-business-1",
  },
};

const canonicalProvisioningInput = {
  ...rawProvisioningInput,
  tenant: {
    ...rawProvisioningInput.tenant,
    defaultContactPhone: "+14155552671",
  },
  domain: {
    subdomain: "svtemple",
    hostname: "svtemple.trytempleos.com",
  },
  firstMember: {
    phoneNumber: "+14155552672",
    displayName: "Temple Admin",
    roles: ["admin" as const],
  },
  whatsappAccount: {
    phoneNumber: "+14155552673",
    metaPhoneNumberId: "meta-phone-1",
    metaBusinessAccountId: "meta-business-1",
  },
};

const provisionedTemple = {
  tenant: {
    id: "tenant-1",
    slug: "sv-temple",
    name: "Sri Venkateswara Temple",
    status: "active" as const,
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
    donationInfo: null,
    notifyOnNewEvent: true,
    notifyOnEventUpdated: false,
    notifyOnEventCancelled: true,
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  },
  domain: {
    id: "domain-1",
    tenantId: "tenant-1",
    hostname: "svtemple.trytempleos.com",
    kind: "primary" as const,
    status: "active" as const,
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  },
  firstMember: {
    id: "membership-1",
    tenantId: "tenant-1",
    personId: "person-1",
    displayName: "Temple Admin",
    status: "active" as const,
    preferredUiLanguage: null,
    lastSignedInAt: null,
    roles: ["admin" as const],
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  },
  roles: ["admin" as const],
  whatsappAccount: null,
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/super-admin/temples", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function invalidJsonRequest(): Request {
  return new Request("http://localhost/api/super-admin/temples", {
    method: "POST",
    body: "{",
  });
}

function mockTenantCookie(value?: string): void {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) => (name === "templeos_session" && value ? { value } : undefined)),
  } as never);
}

describe("super admin temple provisioning route", () => {
  beforeEach(() => {
    vi.mocked(requireSuperAdmin).mockReset();
    vi.mocked(verifySessionToken).mockReset();
    vi.mocked(parseProvisionTempleInput).mockReset();
    vi.mocked(provisionTemple).mockReset();
    vi.mocked(listTenantsForSuperAdmin).mockReset();
    vi.mocked(cookies).mockReset();
    mockTenantCookie();
  });

  it("lists provisioned temples for an authenticated super admin", async () => {
    const temples = [
      {
        id: "tenant-1",
        slug: "sv-temple",
        name: "Sri Venkateswara Temple",
        primaryHostname: "svtemple.trytempleos.com",
        primaryAdminName: "Temple Admin",
        primaryAdminPhoneNumber: "+14155552672",
        activeMemberCount: 2,
        whatsappStatus: "linked" as const,
        lastUpdatedAt: "2026-07-18T08:00:00.000Z",
      },
    ];
    const activeOperationTemples = [
      {
        id: "tenant-1",
        slug: "sv-temple",
        name: "Sri Venkateswara Temple",
        primaryHostname: "svtemple.trytempleos.com",
        primaryAdminName: "Temple Admin",
        primaryAdminPhoneNumber: "+14155552672",
        activeMemberCount: 2,
        lastUpdatedAt: "2026-07-18T08:00:00.000Z",
      },
    ];
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(listTenantsForSuperAdmin).mockResolvedValue(temples);

    const res = await GET();

    const body = await res.json();
    expect(body).toEqual({ temples: activeOperationTemples });
    expect(JSON.stringify(body)).not.toMatch(/whatsappStatus|linked|unlinked/i);
    expect(res.status).toBe(200);
    expect(listTenantsForSuperAdmin).toHaveBeenCalledOnce();
    expect(parseProvisionTempleInput).not.toHaveBeenCalled();
    expect(provisionTemple).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated list requests without reading tenant summaries", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);

    const res = await GET();

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
    expect(listTenantsForSuperAdmin).not.toHaveBeenCalled();
  });

  it("returns 403 for tenant-admin list requests without reading tenant summaries", async () => {
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
    expect(listTenantsForSuperAdmin).not.toHaveBeenCalled();
  });

  it("returns a stable 500 when the super-admin list read fails", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(listTenantsForSuperAdmin).mockRejectedValue(
      new Error("database stack trace with tenant details"),
    );

    const res = await GET();

    await expect(res.json()).resolves.toEqual({
      error: "Temple list failed.",
      code: "TEMPLE_LIST_FAILED",
    });
    expect(res.status).toBe(500);
  });

  it("provisions a temple for an authenticated super admin", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseProvisionTempleInput).mockReturnValue({ ok: true, data: canonicalProvisioningInput });
    vi.mocked(provisionTemple).mockResolvedValue(provisionedTemple);

    const res = await POST(request(rawProvisioningInput) as never);

    await expect(res.json()).resolves.toEqual({ temple: provisionedTemple });
    expect(res.status).toBe(201);
    expect(parseProvisionTempleInput).toHaveBeenCalledWith(rawProvisioningInput);
    expect(provisionTemple).toHaveBeenCalledWith(canonicalProvisioningInput, {
      type: "super_admin",
      superAdminId: "super-admin-1",
      phoneNumber: "+14155552671",
      displayName: "Platform Admin",
    });
  });

  it("returns 400 for invalid JSON without provisioning", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);

    const res = await POST(invalidJsonRequest() as never);

    await expect(res.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(res.status).toBe(400);
    expect(parseProvisionTempleInput).not.toHaveBeenCalled();
    expect(provisionTemple).not.toHaveBeenCalled();
  });

  it("validates syntactically valid but structurally invalid JSON", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseProvisionTempleInput).mockReturnValue({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [{ path: [], message: "Invalid input: expected object" }],
    });

    const res = await POST(request(null) as never);

    await expect(res.json()).resolves.toEqual({
      error: "Invalid provisioning request",
      code: "VALIDATION_ERROR",
      errors: [{ path: [], message: "Invalid field value." }],
    });
    expect(res.status).toBe(400);
    expect(parseProvisionTempleInput).toHaveBeenCalledWith(null);
    expect(provisionTemple).not.toHaveBeenCalled();
  });

  it("returns field errors for invalid provisioning input", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseProvisionTempleInput).mockReturnValue({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [{ path: ["domain", "subdomain"], message: "Subdomain is reserved." }],
    });

    const res = await POST(request({ ...rawProvisioningInput, domain: { subdomain: "www" } }) as never);

    await expect(res.json()).resolves.toEqual({
      error: "Invalid provisioning request",
      code: "VALIDATION_ERROR",
      errors: [{ path: ["domain", "subdomain"], message: "Subdomain is reserved." }],
    });
    expect(res.status).toBe(400);
    expect(provisionTemple).not.toHaveBeenCalled();
  });

  it("redacts validation messages that could include user input", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseProvisionTempleInput).mockReturnValue({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [{ path: ["firstMember", "roles"], message: "Unknown role code: secret-meta-phone-1" }],
    });

    const res = await POST(request(rawProvisioningInput) as never);

    await expect(res.json()).resolves.toEqual({
      error: "Invalid provisioning request",
      code: "VALIDATION_ERROR",
      errors: [{ path: ["firstMember", "roles"], message: "Invalid field value." }],
    });
    expect(res.status).toBe(400);
    expect(provisionTemple).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated requests without provisioning", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);

    const res = await POST(request(rawProvisioningInput) as never);

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
    expect(parseProvisionTempleInput).not.toHaveBeenCalled();
    expect(provisionTemple).not.toHaveBeenCalled();
  });

  it("returns 401 when only an invalid tenant cookie is present", async () => {
    mockTenantCookie("invalid-tenant-session-token");
    vi.mocked(requireSuperAdmin).mockResolvedValue(null);
    vi.mocked(verifySessionToken).mockReturnValue(null);

    const res = await POST(request(rawProvisioningInput) as never);

    await expect(res.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(res.status).toBe(401);
    expect(parseProvisionTempleInput).not.toHaveBeenCalled();
    expect(provisionTemple).not.toHaveBeenCalled();
  });

  it("returns 403 for tenant admins without provisioning", async () => {
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

    const res = await POST(request(rawProvisioningInput) as never);

    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(res.status).toBe(403);
    expect(parseProvisionTempleInput).not.toHaveBeenCalled();
    expect(provisionTemple).not.toHaveBeenCalled();
  });

  it("returns 409 with a stable field for provisioning conflicts", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseProvisionTempleInput).mockReturnValue({ ok: true, data: canonicalProvisioningInput });
    vi.mocked(provisionTemple).mockRejectedValue(
      new ProvisionTempleError(
        "Temple provisioning conflicts with an existing record.",
        409,
        "PROVISIONING_CONFLICT",
        "domain.hostname",
      ),
    );

    const res = await POST(request(rawProvisioningInput) as never);

    await expect(res.json()).resolves.toEqual({
      error: "Temple provisioning conflicts with an existing record.",
      code: "PROVISIONING_CONFLICT",
      field: "domain.hostname",
    });
    expect(res.status).toBe(409);
  });

  it("returns 500 for unexpected errors without leaking stack details", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseProvisionTempleInput).mockReturnValue({ ok: true, data: canonicalProvisioningInput });
    vi.mocked(provisionTemple).mockRejectedValue(new Error("database stack trace with secret meta-phone-1"));

    const res = await POST(request(rawProvisioningInput) as never);

    await expect(res.json()).resolves.toEqual({
      error: "Temple provisioning failed.",
      code: "PROVISIONING_FAILED",
    });
    expect(res.status).toBe(500);
  });

  it("returns a stable 500 for service-level provisioning failures", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(superAdmin);
    vi.mocked(parseProvisionTempleInput).mockReturnValue({ ok: true, data: canonicalProvisioningInput });
    vi.mocked(provisionTemple).mockRejectedValue(
      new ProvisionTempleError("internal detail with secret meta-phone-1", 500, "PROVISIONING_FAILED"),
    );

    const res = await POST(request(rawProvisioningInput) as never);

    await expect(res.json()).resolves.toEqual({
      error: "Temple provisioning failed.",
      code: "PROVISIONING_FAILED",
    });
    expect(res.status).toBe(500);
  });
});
