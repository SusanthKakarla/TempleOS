import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { getActiveTenantDomainByHostname } from "@/lib/db/tenant-domains";
import { getTenantById } from "@/lib/db/tenants";

vi.mock("@/lib/db/tenant-domains", () => ({
  getActiveTenantDomainByHostname: vi.fn(),
}));

vi.mock("@/lib/db/tenants", () => ({
  getTenantById: vi.fn(),
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

const tenant = {
  id: "tenant-1",
  slug: "woop",
  name: "Woop Temple",
  status: "active" as const,
  defaultContactPhone: null,
  address: null,
  timezone: "America/Los_Angeles",
  welcomeMessage: null,
  description: null,
  history: null,
  contactEmail: null,
  googleMapsLink: null,
  morningOpen: null,
  morningClose: null,
  eveningOpen: null,
  eveningClose: null,
  donationInfo: null,
  notifyOnNewEvent: true,
  notifyOnEventUpdated: true,
  notifyOnEventCancelled: true,
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
    vi.mocked(getTenantById).mockReset();
  });

  it("confirms an active tenant hostname and returns the temple name before login", async () => {
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(domain);
    vi.mocked(getTenantById).mockResolvedValue(tenant);

    const res = await GET(request() as never);

    await expect(res.json()).resolves.toEqual({
      ok: true,
      hostname: "woop.trytempleos.com",
      tenant: {
        name: "Woop Temple",
      },
    });
    expect(res.status).toBe(200);
    expect(getActiveTenantDomainByHostname).toHaveBeenCalledWith("woop.trytempleos.com");
    expect(getTenantById).toHaveBeenCalledWith("tenant-1");
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
    expect(getTenantById).not.toHaveBeenCalled();
  });

  it("returns temple not found if an active domain points at a missing tenant", async () => {
    vi.mocked(getActiveTenantDomainByHostname).mockResolvedValue(domain);
    vi.mocked(getTenantById).mockResolvedValue(null);

    const res = await GET(request() as never);

    await expect(res.json()).resolves.toMatchObject({
      error: "Temple does not exist.",
      code: "TEMPLE_NOT_FOUND",
    });
    expect(res.status).toBe(404);
    expect(getTenantById).toHaveBeenCalledWith("tenant-1");
  });

  it("rejects generic hosts before querying tenant domains", async () => {
    const res = await GET(request("https://trytempleos.com/api/auth/tenant-context") as never);

    await expect(res.json()).resolves.toMatchObject({ code: "INVALID_TENANT_CONTEXT" });
    expect(res.status).toBe(400);
    expect(getActiveTenantDomainByHostname).not.toHaveBeenCalled();
  });
});
