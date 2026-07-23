import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireTenantAdminSession } from "@/lib/auth/tenant-admin";
import { createNotificationMedia } from "@/lib/db/notification-media";
import { uploadImage } from "@/lib/media/imagekit";
import type { SessionPayload } from "@/lib/auth/session";

vi.mock("@/lib/auth/tenant-admin", () => ({
  requireTenantAdminSession: vi.fn(),
  tenantAdminAuthResponse: (result: { status: 401 | 403; code: string }) =>
    Response.json({ error: result.code, code: result.code }, { status: result.status }),
}));

vi.mock("@/lib/db/notification-media", () => ({ createNotificationMedia: vi.fn() }));
vi.mock("@/lib/media/imagekit", () => ({ uploadImage: vi.fn() }));

const adminSession: SessionPayload = {
  tenantId: "tenant-1",
  personId: "person-1",
  membershipId: "membership-1",
  roles: ["admin"],
  phoneNumber: "+14155552671",
  displayName: "Tenant Admin",
  exp: Date.now() + 60_000,
};

function requestWithFormData(fields: Record<string, unknown>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value as string | Blob);
  }
  return { formData: async () => formData } as never;
}

describe("media upload route", () => {
  beforeEach(() => {
    vi.mocked(requireTenantAdminSession).mockReset();
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: true, session: adminSession });
    vi.mocked(createNotificationMedia).mockReset();
    vi.mocked(uploadImage).mockReset();
  });

  it("rejects an unsupported file type before touching ImageKit", async () => {
    const file = new File(["not an image"], "malware.exe", { type: "application/x-msdownload" });
    const res = await POST(requestWithFormData({ file, category: "event_banner" }));

    expect(res.status).toBe(400);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("rejects a file over 5MB before touching ImageKit", async () => {
    const oversized = new File([new Uint8Array(6 * 1024 * 1024)], "banner.jpg", { type: "image/jpeg" });
    const res = await POST(requestWithFormData({ file: oversized, category: "event_banner" }));

    expect(res.status).toBe(400);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("rejects an unknown media category", async () => {
    const file = new File(["fake-bytes"], "banner.jpg", { type: "image/jpeg" });
    const res = await POST(requestWithFormData({ file, category: "not_a_real_category" }));

    expect(res.status).toBe(400);
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("uploads a valid image and stores its metadata", async () => {
    vi.mocked(uploadImage).mockResolvedValue({
      fileId: "imagekit-file-abc",
      url: "https://ik.imagekit.io/demo/templeos/tenant-1/event_banner/abc.jpg",
      width: 1200,
      height: 628,
      bytes: 12345,
      format: "jpg",
    });
    vi.mocked(createNotificationMedia).mockResolvedValue({
      id: "media-1",
      tenantId: "tenant-1",
      category: "event_banner",
      title: null,
      storageKey: "imagekit-file-abc",
      imageUrl: "https://ik.imagekit.io/demo/templeos/tenant-1/event_banner/abc.jpg",
      mimeType: "image/jpeg",
      width: 1200,
      height: 628,
      fileSize: 12345,
      createdBy: "membership-1",
      createdAt: "2026-07-22T00:00:00.000Z",
      updatedAt: "2026-07-22T00:00:00.000Z",
    });

    const file = new File(["fake-bytes"], "banner.jpg", { type: "image/jpeg" });
    const res = await POST(requestWithFormData({ file, category: "event_banner" }));

    expect(res.status).toBe(201);
    expect(uploadImage).toHaveBeenCalledWith(expect.any(Buffer), "templeos/tenant-1/event_banner", "banner.jpg");
    expect(createNotificationMedia).toHaveBeenCalledWith(
      "tenant-1",
      expect.objectContaining({ category: "event_banner", createdBy: "membership-1", storageKey: "imagekit-file-abc" }),
    );
  });
});
