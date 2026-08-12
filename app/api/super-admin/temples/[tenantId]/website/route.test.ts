import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { getTenantById } from "@/lib/db/tenants";
import { getTenantWebsite, upsertTenantWebsite } from "@/lib/db/tenant-websites";
import { GET, PATCH } from "./route";

vi.mock("@/lib/auth/super-admin-session", () => ({ requireSuperAdmin: vi.fn() }));
vi.mock("@/lib/db/tenants", () => ({ getTenantById: vi.fn() }));
vi.mock("@/lib/db/tenant-websites", () => ({ getTenantWebsite: vi.fn(), upsertTenantWebsite: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const superAdmin = { id: "sa-1", active: true } as never;

function ctx(tenantId: string) {
  return { params: Promise.resolve({ tenantId }) };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/super-admin/temples/tenant-1/website", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as never;
}

beforeEach(() => {
  vi.mocked(requireSuperAdmin).mockReset().mockResolvedValue(superAdmin);
  vi.mocked(getTenantById).mockReset().mockResolvedValue({ id: "tenant-1", slug: "sivatemple" } as never);
  vi.mocked(getTenantWebsite).mockReset().mockResolvedValue({ id: "w-1", enabled: false } as never);
  vi.mocked(upsertTenantWebsite).mockReset().mockResolvedValue({ id: "w-1", enabled: true } as never);
});

describe("Super Admin website route — authorisation", () => {
  it("rejects a caller who is not a Super Admin, on both verbs", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null as never);

    expect((await GET(new Request("http://localhost") as never, ctx("tenant-1"))).status).toBe(401);
    expect((await PATCH(patchRequest({ enabled: true }), ctx("tenant-1"))).status).toBe(401);
    // Authorisation is decided before anything is read or written.
    expect(getTenantWebsite).not.toHaveBeenCalled();
    expect(upsertTenantWebsite).not.toHaveBeenCalled();
  });

  it("checks Super Admin status server-side, never trusting the tenant id in the URL as permission", async () => {
    vi.mocked(requireSuperAdmin).mockResolvedValue(null as never);
    await PATCH(patchRequest({ enabled: true }), ctx("tenant-1"));
    expect(requireSuperAdmin).toHaveBeenCalled();
  });

  it("404s for a temple that doesn't exist instead of creating one", async () => {
    vi.mocked(getTenantById).mockResolvedValue(null as never);
    const response = await PATCH(patchRequest({ enabled: true }), ctx("ghost"));
    expect(response.status).toBe(404);
    expect(upsertTenantWebsite).not.toHaveBeenCalled();
  });
});

describe("Super Admin website route — enable and disable", () => {
  it("publishes the website", async () => {
    const response = await PATCH(patchRequest({ enabled: true }), ctx("tenant-1"));
    expect(response.status).toBe(200);
    expect(upsertTenantWebsite).toHaveBeenCalledWith("tenant-1", expect.objectContaining({ enabled: true }));
  });

  it("unpublishes the website", async () => {
    await PATCH(patchRequest({ enabled: false }), ctx("tenant-1"));
    expect(upsertTenantWebsite).toHaveBeenCalledWith("tenant-1", expect.objectContaining({ enabled: false }));
  });

  it("writes only the fields sent, so toggling publish cannot blank a temple's content", async () => {
    await PATCH(patchRequest({ enabled: true }), ctx("tenant-1"));
    const [, payload] = vi.mocked(upsertTenantWebsite).mock.calls[0];
    expect(Object.keys(payload)).toEqual(["enabled"]);
  });

  it("rejects an invalid template rather than storing it", async () => {
    const response = await PATCH(patchRequest({ heroTemplate: "nope" }), ctx("tenant-1"));
    expect(response.status).toBe(400);
    expect(upsertTenantWebsite).not.toHaveBeenCalled();
  });
});

describe("Super Admin website route — tenant isolation", () => {
  it("edits the temple named in the route path, not one named in the body", async () => {
    await PATCH(patchRequest({ enabled: true, tenantId: "other-tenant", tenant_id: "other-tenant" }), ctx("tenant-1"));

    const [tenantId, payload] = vi.mocked(upsertTenantWebsite).mock.calls[0];
    expect(tenantId).toBe("tenant-1");
    expect(payload).not.toHaveProperty("tenantId");
    expect(payload).not.toHaveProperty("tenant_id");
  });

  it("reads the website of the temple in the path only", async () => {
    await GET(new Request("http://localhost") as never, ctx("tenant-2"));
    expect(getTenantWebsite).toHaveBeenCalledWith("tenant-2");
    expect(getTenantWebsite).not.toHaveBeenCalledWith("tenant-1");
  });
});
