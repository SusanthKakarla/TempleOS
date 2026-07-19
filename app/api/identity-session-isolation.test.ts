import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TenantMembershipWithRoles } from "@/lib/db/tenant-memberships";
import type { RoleCode } from "@/types/db";

const tenantDomainA = {
  id: "domain-a",
  tenantId: "tenant-a",
  hostname: "temple-a.trytempleos.com",
  kind: "primary",
  status: "active",
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
} as const;

const tenantDomainB = {
  ...tenantDomainA,
  id: "domain-b",
  tenantId: "tenant-b",
  hostname: "temple-b.trytempleos.com",
};

const person = {
  id: "person-shared",
  phoneNumber: "+14155552671",
  displayName: "Shared Person",
  firebaseUid: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

function membership(
  tenantId: string,
  membershipId: string,
  roles: RoleCode[],
): TenantMembershipWithRoles {
  return {
    id: membershipId,
    tenantId,
    personId: person.id,
    displayName: `Member ${tenantId}`,
    status: "active",
    preferredUiLanguage: null,
    lastSignedInAt: null,
    roles,
    createdAt: "2026-07-18T00:00:00.000Z",
    updatedAt: "2026-07-18T00:00:00.000Z",
  };
}

function tenantLoginRequest(
  body: unknown,
  url = "https://temple-a.trytempleos.com/api/auth/session",
): Request {
  return new Request(url, {
    method: "POST",
    headers: { host: new URL(url).host },
    body: JSON.stringify(body),
  });
}

function listRouteSources(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    if (statSync(fullPath).isDirectory()) return listRouteSources(fullPath);
    return fullPath.endsWith(".ts") && !fullPath.endsWith(".test.ts") ? [fullPath] : [];
  });
}

describe("identity and session isolation guardrails", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("@/lib/auth/session");
    vi.doUnmock("@/lib/auth/super-admin-session");
    vi.doUnmock("@/lib/db/super-admins");
    vi.doUnmock("@/lib/db/tenant-memberships");
    vi.doUnmock("@/lib/db/tenant-domains");
    vi.doUnmock("@/lib/db/persons");
    vi.doUnmock("@/lib/firebase/admin");
    vi.doUnmock("@/lib/firebase/errors");
    vi.doUnmock("@/lib/i18n/locale");
    vi.doUnmock("next/headers");
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("SESSION_SECRET", "test-secret");
  });

  it("rejects tenant admin cookies on a super-admin route without satisfying requireSuperAdmin", async () => {
    const requireSuperAdmin = vi.fn().mockResolvedValue(null);
    const verifySessionToken = vi.fn().mockReturnValue({
      tenantId: "tenant-a",
      personId: person.id,
      membershipId: "membership-a",
      roles: ["admin"],
      phoneNumber: person.phoneNumber,
      displayName: "Tenant Admin",
      exp: Date.now() + 60_000,
    });
    const cookieGet = vi.fn((name: string) =>
      name === "templeos_session" ? { value: "tenant-token" } : undefined,
    );

    vi.doMock("@/lib/auth/super-admin-session", () => ({ requireSuperAdmin }));
    vi.doMock("@/lib/auth/session", () => ({
      TENANT_SESSION_COOKIE_NAME: "templeos_session",
      verifySessionToken,
    }));
    vi.doMock("next/headers", () => ({
      cookies: vi.fn().mockResolvedValue({ get: cookieGet }),
    }));

    const { GET } = await import("./super-admin/me/route");
    const res = await GET();

    await expect(res.json()).resolves.toMatchObject({ code: "FORBIDDEN" });
    expect(res.status).toBe(403);
    expect(requireSuperAdmin).toHaveBeenCalledTimes(1);
    expect(verifySessionToken).toHaveBeenCalledWith("tenant-token");
  });

  it("does not let a tenant-only cookie satisfy requireSuperAdmin", async () => {
    vi.doMock("next/headers", () => ({
      cookies: vi.fn().mockResolvedValue({
        get: vi.fn((name: string) =>
          name === "templeos_session" ? { value: "tenant-token" } : undefined,
        ),
      }),
    }));
    vi.doMock("@/lib/db/super-admins", () => ({
      getSuperAdminById: vi.fn(),
    }));

    const { requireSuperAdmin } = await import("@/lib/auth/super-admin-session");

    await expect(requireSuperAdmin()).resolves.toBeNull();
  });

  it("rejects a tenant-shaped token even when it is sent as the super-admin cookie", async () => {
    vi.doMock("next/headers", () => ({
      cookies: vi.fn(),
    }));
    vi.doMock("@/lib/db/super-admins", () => ({
      getSuperAdminById: vi.fn(),
    }));

    const headers = await import("next/headers");
    const superAdmins = await import("@/lib/db/super-admins");
    const { createSessionToken } = await import("@/lib/auth/session");
    const { SUPER_ADMIN_SESSION_COOKIE_NAME, requireSuperAdmin } = await import(
      "@/lib/auth/super-admin-session"
    );
    const tenantShapedToken = createSessionToken({
      tenantId: "tenant-a",
      personId: person.id,
      membershipId: "membership-a",
      roles: ["admin"] as RoleCode[],
      phoneNumber: person.phoneNumber,
      displayName: "Tenant Admin",
    });

    vi.mocked(headers.cookies).mockResolvedValue({
      get: vi.fn((name: string) =>
        name === SUPER_ADMIN_SESSION_COOKIE_NAME ? { value: tenantShapedToken } : undefined,
      ),
    } as never);

    await expect(requireSuperAdmin()).resolves.toBeNull();
    expect(superAdmins.getSuperAdminById).not.toHaveBeenCalled();
  });

  it("creates a tenant session only for the hostname-resolved temple when roles differ by temple", async () => {
    const verifyFirebaseIdToken = vi.fn().mockResolvedValue({
      uid: "firebase-shared",
      phone_number: "+1 415 555 2671",
    });
    const setSessionCookie = vi.fn();
    const getActiveTenantDomainByHostname = vi
      .fn()
      .mockImplementation((hostname: string) =>
        hostname === tenantDomainA.hostname ? tenantDomainA : tenantDomainB,
      );
    const findPersonByPhone = vi.fn().mockResolvedValue(person);
    const bindPersonFirebaseUid = vi.fn().mockResolvedValue(true);
    const findActiveTenantMembershipByPersonAndTenant = vi
      .fn()
      .mockImplementation(({ tenantId }: { tenantId: string }) =>
        tenantId === "tenant-a"
          ? membership("tenant-a", "membership-a", ["admin", "priest"])
          : membership("tenant-b", "membership-b", ["devotee"]),
      );

    vi.doMock("@/lib/firebase/admin", () => ({ verifyFirebaseIdToken }));
    vi.doMock("@/lib/auth/session", () => ({
      clearSessionCookie: vi.fn(),
      setSessionCookie,
    }));
    vi.doMock("@/lib/db/tenant-domains", () => ({ getActiveTenantDomainByHostname }));
    vi.doMock("@/lib/db/persons", () => ({ bindPersonFirebaseUid, findPersonByPhone }));
    vi.doMock("@/lib/db/tenant-memberships", () => ({
      findActiveTenantMembershipByPersonAndTenant,
      touchLastSignedIn: vi.fn(),
    }));
    vi.doMock("@/lib/firebase/errors", () => ({ devLog: vi.fn() }));
    vi.doMock("@/lib/i18n/locale", () => ({ setLocaleCookie: vi.fn() }));

    const { POST } = await import("./auth/session/route");
    const res = await POST(
      tenantLoginRequest(
        { idToken: "token-1", tenantId: "attacker-tenant" },
        "https://temple-a.trytempleos.com/api/auth/session?tenantId=tenant-b",
      ) as never,
    );

    expect(res.status).toBe(200);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("temple-a.trytempleos.com");
    expect(findActiveTenantMembershipByPersonAndTenant).toHaveBeenCalledWith({
      personId: person.id,
      tenantId: "tenant-a",
    });
    expect(setSessionCookie).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      personId: person.id,
      membershipId: "membership-a",
      roles: ["admin", "priest"],
      phoneNumber: person.phoneNumber,
      displayName: "Member tenant-a",
    });
  });

  it("rejects tenant session reads when the live membership belongs to another tenant", async () => {
    vi.doMock("next/headers", () => ({
      cookies: vi.fn(),
    }));
    vi.doMock("@/lib/db/tenant-memberships", () => ({
      getTenantMembershipById: vi.fn(),
    }));

    const headers = await import("next/headers");
    const tenantMemberships = await import("@/lib/db/tenant-memberships");
    const { TENANT_SESSION_COOKIE_NAME, createSessionToken, getSessionAdmin } = await import(
      "@/lib/auth/session"
    );
    const token = createSessionToken({
      tenantId: "tenant-a",
      personId: person.id,
      membershipId: "membership-a",
      roles: ["admin"],
      phoneNumber: person.phoneNumber,
      displayName: "Temple A Admin",
    });

    vi.mocked(headers.cookies).mockResolvedValue({
      get: vi.fn((name: string) =>
        name === TENANT_SESSION_COOKIE_NAME ? { name, value: token } : undefined,
      ),
    } as never);
    vi.mocked(tenantMemberships.getTenantMembershipById).mockResolvedValue(
      membership("tenant-b", "membership-a", ["devotee"]),
    );

    await expect(getSessionAdmin()).resolves.toBeNull();
  });

  it("sets tenant session cookies as host-only so Temple A cookies are not shared with Temple B", async () => {
    const cookieSet = vi.fn();
    vi.doMock("next/headers", () => ({
      cookies: vi.fn().mockResolvedValue({ set: cookieSet }),
    }));
    vi.doMock("@/lib/db/tenant-memberships", () => ({
      getTenantMembershipById: vi.fn(),
    }));

    const { TENANT_SESSION_COOKIE_NAME, setSessionCookie } = await import("@/lib/auth/session");

    await setSessionCookie({
      tenantId: "tenant-a",
      personId: person.id,
      membershipId: "membership-a",
      roles: ["admin"],
      phoneNumber: person.phoneNumber,
      displayName: "Temple A Admin",
    });

    expect(cookieSet).toHaveBeenCalledWith(
      TENANT_SESSION_COOKIE_NAME,
      expect.any(String),
      expect.not.objectContaining({ domain: expect.any(String) }),
    );
  });

  it.each(["https://trytempleos.com/api/auth/session", "https://www.trytempleos.com/api/auth/session"])(
    "rejects generic tenant login hosts before session creation: %s",
    async (url) => {
      const verifyFirebaseIdToken = vi.fn().mockResolvedValue({
        uid: "firebase-shared",
        phone_number: "+1 415 555 2671",
      });
      const setSessionCookie = vi.fn();
      const getActiveTenantDomainByHostname = vi.fn();

      vi.doMock("@/lib/firebase/admin", () => ({ verifyFirebaseIdToken }));
      vi.doMock("@/lib/auth/session", () => ({
        clearSessionCookie: vi.fn(),
        setSessionCookie,
      }));
      vi.doMock("@/lib/db/tenant-domains", () => ({ getActiveTenantDomainByHostname }));
      vi.doMock("@/lib/db/persons", () => ({
        bindPersonFirebaseUid: vi.fn(),
        findPersonByPhone: vi.fn(),
      }));
      vi.doMock("@/lib/db/tenant-memberships", () => ({
        findActiveTenantMembershipByPersonAndTenant: vi.fn(),
      }));
      vi.doMock("@/lib/firebase/errors", () => ({ devLog: vi.fn() }));

      const { POST } = await import("./auth/session/route");
      const res = await POST(tenantLoginRequest({ idToken: "token-1" }, url) as never);

      await expect(res.json()).resolves.toMatchObject({ code: "INVALID_TENANT_CONTEXT" });
      expect(res.status).toBe(400);
      expect(getActiveTenantDomainByHostname).not.toHaveBeenCalled();
      expect(setSessionCookie).not.toHaveBeenCalled();
    },
  );

  it("allows local tenant host override outside production but rejects it in production", async () => {
    const verifyFirebaseIdToken = vi.fn().mockResolvedValue({
      uid: "firebase-shared",
      phone_number: "+1 415 555 2671",
    });
    const setSessionCookie = vi.fn();
    const getActiveTenantDomainByHostname = vi.fn().mockResolvedValue(tenantDomainA);
    const findPersonByPhone = vi.fn().mockResolvedValue(person);
    const bindPersonFirebaseUid = vi.fn().mockResolvedValue(true);
    const findActiveTenantMembershipByPersonAndTenant = vi
      .fn()
      .mockResolvedValue(membership("tenant-a", "membership-a", ["admin"]));
    const devLog = vi.fn();

    vi.doMock("@/lib/firebase/admin", () => ({ verifyFirebaseIdToken }));
    vi.doMock("@/lib/auth/session", () => ({
      clearSessionCookie: vi.fn(),
      setSessionCookie,
    }));
    vi.doMock("@/lib/db/tenant-domains", () => ({ getActiveTenantDomainByHostname }));
    vi.doMock("@/lib/db/persons", () => ({ bindPersonFirebaseUid, findPersonByPhone }));
    vi.doMock("@/lib/db/tenant-memberships", () => ({
      findActiveTenantMembershipByPersonAndTenant,
      touchLastSignedIn: vi.fn(),
    }));
    vi.doMock("@/lib/firebase/errors", () => ({ devLog }));
    vi.doMock("@/lib/i18n/locale", () => ({ setLocaleCookie: vi.fn() }));

    vi.stubEnv("TEMPLEOS_LOCAL_TENANT_HOST", "temple-a.trytempleos.com");
    const { POST } = await import("./auth/session/route");
    const localRes = await POST(
      tenantLoginRequest({ idToken: "token-1" }, "http://localhost:3000/api/auth/session") as never,
    );

    expect(localRes.status).toBe(200);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("temple-a.trytempleos.com");

    vi.stubEnv("NODE_ENV", "production");
    getActiveTenantDomainByHostname.mockClear();
    setSessionCookie.mockClear();

    const productionRes = await POST(
      tenantLoginRequest({ idToken: "token-1" }, "http://localhost:3000/api/auth/session") as never,
    );

    await expect(productionRes.json()).resolves.toMatchObject({
      code: "INVALID_TENANT_CONTEXT",
    });
    expect(productionRes.status).toBe(400);
    expect(getActiveTenantDomainByHostname).not.toHaveBeenCalled();
    expect(setSessionCookie).not.toHaveBeenCalled();
    expect(devLog).toHaveBeenCalledWith(
      "TEMPLEOS_LOCAL_TENANT_HOST is ignored in production tenant sign-in.",
    );
  });

  it("keeps super-admin route sources free of tenant dashboard authorization and legacy auth", () => {
    const sources = [
      ...listRouteSources(path.join(process.cwd(), "app/api/super-admin")),
      path.join(process.cwd(), "lib/auth/super-admin-session.ts"),
    ];

    for (const source of sources) {
      const body = readFileSync(source, "utf8");
      expect(body, source).not.toMatch(
        /(?:from\s+["'][^"']*tenant-admin["']|import\s+["'][^"']*tenant-admin["']|requireTenantAdminSession)/,
      );
      expect(body, source).not.toMatch(/getSessionAdmin/);
      expect(body, source).not.toMatch(/admin-users|admin_users|getPilotTenant/);
      expect(body, source).not.toMatch(/requireLegacyTenantSuperAdmin/);
    }
  });
});
