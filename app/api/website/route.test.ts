import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireTenantAdminSession } from "@/lib/auth/tenant-admin";
import { getTenantWebsite, upsertTenantWebsite } from "@/lib/db/tenant-websites";
import { GET, PATCH } from "./route";

vi.mock("@/lib/auth/tenant-admin", () => ({
  requireTenantAdminSession: vi.fn(),
  tenantAdminAuthResponse: () => new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
}));
vi.mock("@/lib/db/tenant-websites", () => ({ getTenantWebsite: vi.fn(), upsertTenantWebsite: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/website", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

const session = { tenantId: "tenant-1", membershipId: "m-1" };

beforeEach(() => {
  vi.mocked(requireTenantAdminSession).mockReset().mockResolvedValue({ ok: true, session } as never);
  vi.mocked(getTenantWebsite).mockReset().mockResolvedValue(null);
  vi.mocked(upsertTenantWebsite).mockReset().mockResolvedValue({ id: "w-1", tenantId: "tenant-1" } as never);
});

describe("GET /api/website", () => {
  it("requires an authenticated tenant admin", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: false, status: 401 } as never);
    expect((await GET()).status).toBe(401);
  });

  it("reads only the caller's own website", async () => {
    await GET();
    expect(getTenantWebsite).toHaveBeenCalledWith("tenant-1");
  });
});

describe("PATCH /api/website", () => {
  it("requires an authenticated tenant admin", async () => {
    vi.mocked(requireTenantAdminSession).mockResolvedValue({ ok: false, status: 401 } as never);
    expect((await PATCH(patchRequest({ enabled: true }))).status).toBe(401);
  });

  it("writes to the session's tenant, ignoring any tenant id in the body", async () => {
    await PATCH(patchRequest({ enabled: true, tenantId: "someone-else", tenant_id: "someone-else" }));

    const [tenantId, payload] = vi.mocked(upsertTenantWebsite).mock.calls[0];
    expect(tenantId).toBe("tenant-1");
    // The schema strips unknown keys, so a forged tenant id cannot even reach
    // the repository as a stray field.
    expect(payload).not.toHaveProperty("tenantId");
    expect(payload).not.toHaveProperty("tenant_id");
  });

  it("rejects an invalid template or theme rather than storing it", async () => {
    const response = await PATCH(patchRequest({ heroTemplate: "not-a-template" }));
    expect(response.status).toBe(400);
    expect(upsertTenantWebsite).not.toHaveBeenCalled();
  });

  it("accepts a website being switched on and off", async () => {
    expect((await PATCH(patchRequest({ enabled: true }))).status).toBe(200);
    expect((await PATCH(patchRequest({ enabled: false }))).status).toBe(200);
    expect(vi.mocked(upsertTenantWebsite).mock.calls.map(([, payload]) => payload.enabled)).toEqual([true, false]);
  });

  it("treats whitespace-only copy as cleared, matching the site's empty-hides-section rule", async () => {
    await PATCH(patchRequest({ story: "   ", heroTitle: "  Vinayaka Chavithi  " }));
    const [, payload] = vi.mocked(upsertTenantWebsite).mock.calls[0];
    expect(payload.story).toBeNull();
    expect(payload.heroTitle).toBe("Vinayaka Chavithi");
  });

  it("has no fields for operational data, which the site reads live from its own modules", async () => {
    await PATCH(
      patchRequest({ enabled: true, morningOpen: "06:00", events: [{ title: "x" }], sevas: [], gallery: ["a"] }),
    );
    const [, payload] = vi.mocked(upsertTenantWebsite).mock.calls[0];
    for (const key of ["morningOpen", "events", "sevas", "gallery"]) {
      expect(payload).not.toHaveProperty(key);
    }
  });
});
