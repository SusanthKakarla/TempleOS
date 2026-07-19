import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cookies } from "next/headers";
import { getTenantMembershipById } from "@/lib/db/tenant-memberships";
import {
  TENANT_SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionAdmin,
} from "@/lib/auth/session";
import type { RoleCode } from "@/types/db";

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/db/tenant-memberships", () => ({
  getTenantMembershipById: vi.fn(),
}));

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

const sessionPayload = {
  tenantId: "tenant-1",
  personId: "person-1",
  membershipId: "membership-1",
  roles: ["admin"] as RoleCode[],
  phoneNumber: "+919876543210",
  displayName: "Session Name",
};

const membership = {
  id: "membership-1",
  tenantId: "tenant-1",
  personId: "person-1",
  displayName: "Live Name",
  status: "active" as const,
  preferredUiLanguage: null,
  lastSignedInAt: null,
  roles: ["volunteer"] as RoleCode[],
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

function mockCookieToken(token: string) {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === TENANT_SESSION_COOKIE_NAME ? { name, value: token } : undefined,
    ),
  } as never);
}

describe("live tenant session authorization", () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset();
    vi.mocked(getTenantMembershipById).mockReset();
  });

  it("rejects a valid cookie when the membership is no longer active", async () => {
    mockCookieToken(createSessionToken(sessionPayload));
    vi.mocked(getTenantMembershipById).mockResolvedValue(null);

    await expect(getSessionAdmin()).resolves.toBeNull();
  });

  it("rejects a valid cookie when the membership no longer belongs to the same person and tenant", async () => {
    mockCookieToken(createSessionToken(sessionPayload));
    vi.mocked(getTenantMembershipById).mockResolvedValue({ ...membership, tenantId: "tenant-2" });

    await expect(getSessionAdmin()).resolves.toBeNull();
  });

  it("returns current membership roles and display name for an active membership", async () => {
    mockCookieToken(createSessionToken(sessionPayload));
    vi.mocked(getTenantMembershipById).mockResolvedValue(membership);

    await expect(getSessionAdmin()).resolves.toMatchObject({
      ...sessionPayload,
      roles: ["volunteer"],
      displayName: "Live Name",
    });
  });
});
