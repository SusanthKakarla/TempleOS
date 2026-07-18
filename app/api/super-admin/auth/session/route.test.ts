import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";
import { verifyFirebaseIdToken } from "@/lib/firebase/admin";
import {
  bindSuperAdminFirebaseUid,
  findActiveSuperAdminByPhone,
} from "@/lib/db/super-admins";
import {
  clearSuperAdminSessionCookie,
  setSuperAdminSessionCookie,
} from "@/lib/auth/super-admin-session";

vi.mock("@/lib/firebase/admin", () => ({
  verifyFirebaseIdToken: vi.fn(),
}));

vi.mock("@/lib/db/super-admins", () => ({
  bindSuperAdminFirebaseUid: vi.fn(),
  findActiveSuperAdminByPhone: vi.fn(),
}));

vi.mock("@/lib/auth/super-admin-session", () => ({
  clearSuperAdminSessionCookie: vi.fn(),
  setSuperAdminSessionCookie: vi.fn(),
}));

vi.mock("@/lib/firebase/errors", () => ({
  devLog: vi.fn(),
}));

const superAdmin = {
  id: "super-admin-1",
  phoneNumber: "+14155552671",
  displayName: "Platform Admin",
  firebaseUid: null,
  active: true,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/super-admin/auth/session", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("super admin auth session route", () => {
  beforeEach(() => {
    vi.mocked(verifyFirebaseIdToken).mockReset();
    vi.mocked(findActiveSuperAdminByPhone).mockReset();
    vi.mocked(bindSuperAdminFirebaseUid).mockReset();
    vi.mocked(setSuperAdminSessionCookie).mockReset();
    vi.mocked(clearSuperAdminSessionCookie).mockReset();
  });

  it("creates a super admin session for an active allowlisted phone", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-1",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(findActiveSuperAdminByPhone).mockResolvedValue(superAdmin);
    vi.mocked(bindSuperAdminFirebaseUid).mockResolvedValue(true);

    const res = await POST(request({ idToken: "token-1" }) as never);

    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(res.status).toBe(200);
    expect(findActiveSuperAdminByPhone).toHaveBeenCalledWith("+1 415 555 2671");
    expect(bindSuperAdminFirebaseUid).toHaveBeenCalledWith("super-admin-1", "firebase-1");
    expect(setSuperAdminSessionCookie).toHaveBeenCalledWith({
      superAdminId: "super-admin-1",
      phoneNumber: "+14155552671",
      displayName: "Platform Admin",
    });
  });

  it("denies a valid Firebase user whose phone is not a super admin", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-2",
      phone_number: "+1 415 555 2672",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(findActiveSuperAdminByPhone).mockResolvedValue(null);

    const res = await POST(request({ idToken: "token-2" }) as never);

    await expect(res.json()).resolves.toMatchObject({ code: "NOT_AUTHORIZED" });
    expect(res.status).toBe(403);
    expect(setSuperAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("denies a Firebase uid mismatch without setting a cookie", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-3",
      phone_number: "+1 415 555 2671",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    vi.mocked(findActiveSuperAdminByPhone).mockResolvedValue({
      ...superAdmin,
      firebaseUid: "firebase-1",
    });
    vi.mocked(bindSuperAdminFirebaseUid).mockResolvedValue(false);

    const res = await POST(request({ idToken: "token-3" }) as never);

    await expect(res.json()).resolves.toMatchObject({ code: "FIREBASE_UID_MISMATCH" });
    expect(res.status).toBe(403);
    expect(setSuperAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("rejects missing or invalid token input", async () => {
    const invalidBody = await POST(request({}) as never);
    expect(invalidBody.status).toBe(400);

    vi.mocked(verifyFirebaseIdToken).mockRejectedValue(new Error("bad token"));
    const invalidToken = await POST(request({ idToken: "bad" }) as never);
    expect(invalidToken.status).toBe(401);
  });

  it("rejects missing or non-string phone claims", async () => {
    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-4",
    } as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    const missingClaim = await POST(request({ idToken: "missing-phone" }) as never);
    expect(missingClaim.status).toBe(401);

    vi.mocked(verifyFirebaseIdToken).mockResolvedValue({
      uid: "firebase-5",
      phone_number: 14155552671,
    } as unknown as Awaited<ReturnType<typeof verifyFirebaseIdToken>>);
    const nonStringClaim = await POST(request({ idToken: "non-string-phone" }) as never);
    expect(nonStringClaim.status).toBe(401);

    expect(findActiveSuperAdminByPhone).not.toHaveBeenCalledWith(14155552671);
    expect(setSuperAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("clears only the super admin session cookie", async () => {
    const res = await DELETE();

    await expect(res.json()).resolves.toEqual({ ok: true });
    expect(clearSuperAdminSessionCookie).toHaveBeenCalledTimes(1);
  });
});
