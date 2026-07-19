import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getActiveTenantDomainByHostname } from "@/lib/db/tenant-domains";

vi.mock("@/lib/db/tenant-domains", () => ({
  getActiveTenantDomainByHostname: vi.fn(),
}));

vi.mock("@/lib/firebase/errors", () => ({
  devLog: vi.fn(),
}));

const domain = {
  id: "domain-1",
  tenantId: "tenant-1",
  hostname: "woop.trytempleos.com",
  kind: "primary",
  status: "active",
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
} as const;

function request(url = "https://woop.trytempleos.com/api/auth/tenant-context"): Request {
  return new Request(url, {
    method: "GET",
    headers: { host: new URL(url).host },
  });
}

describe("tenant auth context route", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("NODE_ENV", "test");
    vi.mocked(getActiveTenantDomainByHostname).mockReset();
  });

  it("confirms an active tenant hostname before login", async () => {
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(domain);

    const res = await GET(request() as never);

    await expect(res.json()).resolves.toEqual({ ok: true, hostname: "woop.trytempleos.com" });
    expect(res.status).toBe(200);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("woop.trytempleos.com");
  });

  it("returns temple not found before login for unknown tenant hostnames", async () => {
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(null);

    const res = await GET(request("https://missing.trytempleos.com/api/auth/tenant-context") as never);

    await expect(res.json()).resolves.toEqual({
      error: "Temple does not exist.",
      code: "TEMPLE_NOT_FOUND",
    });
    expect(res.status).toBe(404);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("missing.trytempleos.com");
  });

  it("rejects generic hosts before querying tenant domains", async () => {
    const res = await GET(request("https://trytempleos.com/api/auth/tenant-context") as never);

    await expect(res.json()).resolves.toMatchObject({ code: "INVALID_TENANT_CONTEXT" });
    expect(res.status).toBe(400);
    expect(getActiveTenantDomainByHostname).not.toHaveBeenCalled();
  });
});
