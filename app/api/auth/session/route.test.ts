import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import { setSessionCookie, clearSessionCookie } from "@/lib/auth/session";
import { getActiveTenantDomainByHostname } from "@/lib/db/tenant-domains";
import { bindPersonFirebaseUid, findPersonByPhone } from "@/lib/db/persons";
import { findActiveTenantMembershipByPersonAndTenant } from "@/lib/db/tenant-memberships";
import { devLog } from "@/lib/firebase/errors";
import { setLocaleCookie } from "@/lib/i18n/locale";
import type { TenantMembershipWithRoles } from "@/lib/db/tenant-memberships";

vi.mock("@/lib/firebase/admin", () => ({
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  clearSessionCookie: vi.fn(),
  setSessionCookie: vi.fn(),
}));

vi.mock("@/lib/i18n/locale", () => ({
  setLocaleCookie: vi.fn(),
}));

vi.mock("@/lib/db/tenant-domains", () => ({
  getActiveTenantDomainByHostname: vi.fn(),
}));

vi.mock("@/lib/db/persons", () => ({
  bindPersonFirebaseUid: vi.fn(),
  findPersonByPhone: vi.fn(),
}));

vi.mock("@/lib/db/tenant-memberships", () => ({
  findActiveTenantMembershipByPersonAndTenant: vi.fn(),
  touchLastSignedIn: vi.fn(),
}));

vi.mock("@/lib/firebase/errors", () => ({
  devLog: vi.fn(),
}));

const domain = {
  id: "domain-1",
  tenantId: "tenant-1",
  hostname: "svtemple.trytempleos.com",
  kind: "primary",
  status: "active",
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
} as const;

const person = {
  id: "person-1",
  phoneNumber: "+14155552671",
  displayName: "Tenant Member",
  firebaseUid: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const membership: TenantMembershipWithRoles = {
  id: "membership-1",
  tenantId: "tenant-1",
  personId: "person-1",
  displayName: "Tenant Member",
  status: "active",
  preferredUiLanguage: null,
  lastSignedInAt: null,
  roles: ["admin", "priest"],
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

function request(body: unknown, url = "https://svtemple.trytempleos.com/api/auth/session"): Request {
  return new Request(url, {
    method: "POST",
    headers: { host: new URL(url).host },
    body: JSON.stringify(body),
  });
}

function forwardedRequest(
  body: unknown,
  input: {
    url?: string;
    host?: string;
    forwardedHost?: string;
  },
): Request {
  const url = input.url ?? "https://internal.example.com/api/auth/session";
  const headers = new Headers({ "Content-Type": "application/json" });
  if (input.host) headers.set("host", input.host);
  if (input.forwardedHost) headers.set("x-forwarded-host", input.forwardedHost);

  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("tenant auth session route", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(verifyFirebaseIdToken).mockReset();
    vi.mocked(setSessionCookie).mockReset();
    vi.mocked(clearSessionCookie).mockReset();
    vi.mocked(setLocaleCookie).mockReset();
    vi.mocked(getActiveTenantDomainByHostname).mockReset();
    vi.mocked(findPersonByPhone).mockReset();
    vi.mocked(bindPersonFirebaseUid).mockReset();
    vi.mocked(findActiveTenantMembershipByPersonAndTenant).mockReset();
    vi.mocked(devLog).mockReset();
  });

  it("creates a tenant membership session for a verified phone on an active tenant hostname", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(domain);
    vi.mocked(findPersonByPhone).mockResolvedValue(person);
    vi.mocked(bindPersonFirebaseUid).mockResolvedValue(true);
    vi.mocked(findActiveTenantMembershipByPersonAndTenant).mockResolvedValue(membership);

    const res = await POST(request({ idToken: "token-1" }) as never);

    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(res.status).toBe(200);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("svtemple.trytempleos.com");
    expect(findPersonByPhone).toHaveBeenCalledWith("+1 415 555 2671");
    expect(findActiveTenantMembershipByPersonAndTenant).toHaveBeenCalledWith({
      personId: "person-1",
      tenantId: "tenant-1",
    });
    expect(setSessionCookie).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      personId: "person-1",
      membershipId: "membership-1",
      roles: ["admin", "priest"],
      phoneNumber: "+14155552671",
      displayName: "Tenant Member",
    });
  });

  it("uses only the request hostname when the same person belongs to multiple temples", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue({
      ...domain,
      tenantId: "tenant-2",
      hostname: "othertemple.trytempleos.com",
    });
    vi.mocked(findPersonByPhone).mockResolvedValue(person);
    vi.mocked(bindPersonFirebaseUid).mockResolvedValue(true);
    vi.mocked(findActiveTenantMembershipByPersonAndTenant).mockResolvedValue({
      ...membership,
      id: "membership-2",
      tenantId: "tenant-2",
      roles: ["volunteer"],
    });

    const res = await POST(
      request(
        { idToken: "token-1", tenantId: "attacker-tenant" },
        "https://othertemple.trytempleos.com/api/auth/session",
      ) as never,
    );

    expect(res.status).toBe(200);
    expect(findActiveTenantMembershipByPersonAndTenant).toHaveBeenCalledWith({
      personId: "person-1",
      tenantId: "tenant-2",
    });
    expect(setSessionCookie).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-2", membershipId: "membership-2" }),
    );
  });

  it("rejects generic hosts before person or membership lookup", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);

    const res = await POST(
      request({ idToken: "token-1" }, "https://trytempleos.com/api/auth/session") as never,
    );

    await expect(res.json()).resolves.toMatchObject({ code: "INVALID_TENANT_CONTEXT" });
    expect(res.status).toBe(400);
    expect(findPersonByPhone).not.toHaveBeenCalled();
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("returns temple not found for valid tenant hostnames without an active domain row", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(null);

    const res = await POST(
      request({ idToken: "token-1" }, "https://missing.trytempleos.com/api/auth/session") as never,
    );

    await expect(res.json()).resolves.toEqual({
      error: "Temple does not exist.",
      code: "TEMPLE_NOT_FOUND",
    });
    expect(res.status).toBe(404);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("missing.trytempleos.com");
    expect(findPersonByPhone).not.toHaveBeenCalled();
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("allows a local tenant host override outside production", async () => {
    vi.stubEnv("TEMPLEOS_LOCAL_TENANT_HOST", "svtemple.trytempleos.com");
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(domain);
    vi.mocked(findPersonByPhone).mockResolvedValue(person);
    vi.mocked(bindPersonFirebaseUid).mockResolvedValue(true);
    vi.mocked(findActiveTenantMembershipByPersonAndTenant).mockResolvedValue(membership);

    const res = await POST(request({ idToken: "token-1" }, "http://localhost:3000/api/auth/session") as never);

    expect(res.status).toBe(200);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("svtemple.trytempleos.com");
  });

  it("ignores a local tenant host override in production and uses the request hostname", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TEMPLEOS_LOCAL_TENANT_HOST", "local-only.trytempleos.com");
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(domain);
    vi.mocked(findPersonByPhone).mockResolvedValue(person);
    vi.mocked(bindPersonFirebaseUid).mockResolvedValue(true);
    vi.mocked(findActiveTenantMembershipByPersonAndTenant).mockResolvedValue(membership);

    const res = await POST(request({ idToken: "token-1" }) as never);

    expect(res.status).toBe(200);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("svtemple.trytempleos.com");
    expect(devLog).toHaveBeenCalledWith(
      "TEMPLEOS_LOCAL_TENANT_HOST is ignored in production tenant sign-in.",
    );
  });

  it("uses x-forwarded-host before internal hostnames for proxied wildcard domains", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue({
      ...domain,
      hostname: "woop.trytempleos.com",
    });
    vi.mocked(findPersonByPhone).mockResolvedValue(person);
    vi.mocked(bindPersonFirebaseUid).mockResolvedValue(true);
    vi.mocked(findActiveTenantMembershipByPersonAndTenant).mockResolvedValue(membership);

    const res = await POST(
      forwardedRequest(
        { idToken: "token-1" },
        {
          host: "templeos-production.internal",
          forwardedHost: "woop.trytempleos.com",
        },
      ) as never,
    );

    expect(res.status).toBe(200);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("woop.trytempleos.com");
  });

  it("denies missing person, missing membership, and Firebase uid mismatch without setting a cookie", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(domain);
    vi.mocked(findPersonByPhone).mockResolvedValueOnce(null);

    const missingPerson = await POST(request({ idToken: "token-1" }) as never);
    expect(missingPerson.status).toBe(403);

    vi.mocked(findPersonByPhone).mockResolvedValueOnce({ ...person, firebaseUid: "firebase-2" });
    vi.mocked(findActiveTenantMembershipByPersonAndTenant).mockResolvedValueOnce(membership);
    vi.mocked(bindPersonFirebaseUid).mockResolvedValueOnce(false);
    const mismatch = await POST(request({ idToken: "token-1" }) as never);
    expect(mismatch.status).toBe(403);

    vi.mocked(findPersonByPhone).mockResolvedValueOnce(person);
    vi.mocked(findActiveTenantMembershipByPersonAndTenant).mockResolvedValueOnce(null);
    const missingMembership = await POST(request({ idToken: "token-1" }) as never);
    expect(missingMembership.status).toBe(403);
    expect(bindPersonFirebaseUid).toHaveBeenCalledTimes(1);

    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("rejects invalid input, invalid tokens, and non-string phone claims", async () => {
    const invalidBody = await POST(request({}) as never);
    expect(invalidBody.status).toBe(400);

    vi.mocked(verifyFirebaseIdToken).mockRejectedValueOnce(new Error("bad token"));
    const invalidToken = await POST(request({ idToken: "bad" }) as never);
    expect(invalidToken.status).toBe(401);

    vi.mocked(verifyFirebaseIdToken).mockResolvedValueOnce({
      uid: "firebase-2",
      phone_number: 14155552671,
    } as unknown as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    const nonStringClaim = await POST(request({ idToken: "token-2" }) as never);
    expect(nonStringClaim.status).toBe(401);
    expect(findPersonByPhone).not.toHaveBeenCalledWith(14155552671);
  });

  it("clears only the tenant session cookie", async () => {
    const res = await DELETE();

    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });
});
