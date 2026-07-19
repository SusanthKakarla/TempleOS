import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  SUPER_ADMIN_SESSION_COOKIE_NAME,
  SUPER_ADMIN_SESSION_MAX_AGE_SECONDS,
  createSuperAdminSessionToken,
  requireSuperAdmin,
  verifySuperAdminSessionToken,
} from "./super-admin-session";
import { getSuperAdminById } from "@/lib/db/super-admins";
import { cookies } from "next/headers";

vi.mock("@/lib/db/super-admins", () => ({
  getSuperAdminById: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret";
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(getSuperAdminById).mockReset();
  vi.mocked(cookies).mockReset();
});

describe("super-admin session token", () => {
  const payload = {
    superAdminId: "super-admin-1",
    phoneNumber: "+919876543210",
    displayName: "Platform Admin",
  };

  it("round-trips a valid super-admin payload", () => {
    const token = createSuperAdminSessionToken(payload);
    expect(verifySuperAdminSessionToken(token)).toMatchObject(payload);
  });

  it("uses a distinct cookie name and 24-hour lifetime", () => {
    expect(SUPER_ADMIN_SESSION_COOKIE_NAME).toBe("templeos_super_admin_session");
    expect(SUPER_ADMIN_SESSION_MAX_AGE_SECONDS).toBe(60 * 60 * 24);
  });

  it("rejects tampered, malformed, expired, and tenant-shaped tokens", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-18T00:00:00Z"));

    const token = createSuperAdminSessionToken(payload);
    const tenantPayload = Buffer.from(
      JSON.stringify({
        adminId: "admin-1",
        tenantId: "tenant-1",
        phoneNumber: "+919876543210",
        displayName: "Tenant Admin",
        exp: Date.now() + 60_000,
      }),
      "utf8",
    ).toString("base64url");
    const tenantShaped = `${tenantPayload}.${token.split(".")[1]}`;

    expect(verifySuperAdminSessionToken(tenantShaped)).toBeNull();
    expect(verifySuperAdminSessionToken("not-a-token")).toBeNull();

    vi.advanceTimersByTime((SUPER_ADMIN_SESSION_MAX_AGE_SECONDS + 1) * 1000);
    expect(verifySuperAdminSessionToken(token)).toBeNull();
  });

  it("live-checks the super_admins row for missing and inactive admins", async () => {
    const token = createSuperAdminSessionToken(payload);
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn((name: string) =>
        name === SUPER_ADMIN_SESSION_COOKIE_NAME ? { value: token } : undefined,
      ),
    } as never);

    vi.mocked(getSuperAdminById).mockResolvedValueOnce(null);
    await expect(requireSuperAdmin()).resolves.toBeNull();

    vi.mocked(getSuperAdminById).mockResolvedValueOnce({
      id: "super-admin-1",
      personId: "person-1",
      phoneNumber: "+919876543210",
      displayName: "Platform Admin",
      firebaseUid: "firebase-1",
      active: false,
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    });
    await expect(requireSuperAdmin()).resolves.toBeNull();
  });
});
