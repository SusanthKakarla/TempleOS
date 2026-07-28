import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { requireTenantAdminSession } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { enqueueTempleAnnouncement } from "@/lib/db/manual-broadcasts";
import { processNotifications } from "@/lib/notifications/delivery";
import type { SessionPayload } from "@/lib/auth/session";

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  // after() requires a real Next.js request context, which doesn't exist in
  // this unit test — run the callback synchronously instead so its effect
  // (processNotifications) can be asserted on directly.
  return { ...actual, after: (cb: () => void) => cb() };
});
vi.mock("@/lib/auth/tenant-admin", () => ({
  requireTenantAdminSession: vi.fn(),
  tenantAdminAuthResponse: (result: { status: 401 | 403; code: string }) =>
    Response.json({ error: result.code, code: result.code }, { status: result.status }),
}));
vi.mock("@/lib/auth/features", () => ({ requireTenantFeatureApi: vi.fn() }));
vi.mock("@/lib/db/manual-broadcasts", () => ({ enqueueTempleAnnouncement: vi.fn() }));
vi.mock("@/lib/notifications/delivery", () => ({ processNotifications: vi.fn() }));

const adminSession: SessionPayload = {
  tenantId: "tenant-1",
  personId: "person-1",
  membershipId: "membership-1",
  roles: ["admin"],
  phoneNumber: "+14155552671",
  displayName: "Tenant Admin",
  exp: Date.now() + 60_000,
};

function request(body: unknown): Request {
  return new Request("http://localhost/api/chatbot-settings/announcements", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chatbot-settings/announcements", () => {
  beforeEach(() => {
    vi.mocked(requireTenantAdminSession).mockReset().mockResolvedValue({ ok: true, session: adminSession });
    vi.mocked(requireTenantFeatureApi).mockReset().mockResolvedValue(null);
    vi.mocked(enqueueTempleAnnouncement).mockReset();
    vi.mocked(processNotifications).mockReset().mockResolvedValue(undefined);
  });

  it("requires a tenant admin session", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: false, status: 401, code: "UNAUTHORIZED" });
    const res = await POST(request({ message: "Hello" }) as never);
    expect(res.status).toBe(401);
    expect(enqueueTempleAnnouncement).not.toHaveBeenCalled();
  });

  it("respects the notifications feature flag", async () => {
    vi.mocked(requireTenantFeatureApi).mockResolvedValue(
      Response.json({ error: "disabled", code: "FEATURE_DISABLED" }, { status: 403 }) as never,
    );
    const res = await POST(request({ message: "Hello" }) as never);
    expect(res.status).toBe(403);
    expect(enqueueTempleAnnouncement).not.toHaveBeenCalled();
  });

  it("rejects an empty message before ever enqueuing", async () => {
    const res = await POST(request({ message: "   " }) as never);
    expect(res.status).toBe(400);
    expect(enqueueTempleAnnouncement).not.toHaveBeenCalled();
  });

  it("rejects a message over 1000 characters", async () => {
    const res = await POST(request({ message: "a".repeat(1001) }) as never);
    expect(res.status).toBe(400);
  });

  it("enqueues the trimmed message for the caller's own tenant and reports how many devotees were reached", async () => {
    vi.mocked(enqueueTempleAnnouncement).mockResolvedValue(["n1", "n2", "n3"]);

    const res = await POST(request({ message: "  Temple closed tomorrow.  " }) as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json).toEqual({ sentTo: 3 });
    expect(enqueueTempleAnnouncement).toHaveBeenCalledWith("tenant-1", "Temple closed tomorrow.");
    expect(processNotifications).toHaveBeenCalledWith(["n1", "n2", "n3"]);
  });

  it("does not call processNotifications when no devotee was eligible", async () => {
    vi.mocked(enqueueTempleAnnouncement).mockResolvedValue([]);
    const res = await POST(request({ message: "Hello" }) as never);
    const json = await res.json();
    expect(json).toEqual({ sentTo: 0 });
    expect(processNotifications).not.toHaveBeenCalled();
  });
});
