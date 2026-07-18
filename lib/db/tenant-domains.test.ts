import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { getActiveTenantDomainByHostname } from "./tenant-domains";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const row = {
  id: "domain-1",
  tenant_id: "tenant-1",
  hostname: "svtemple.trytempleos.com",
  kind: "primary",
  status: "active",
  created_at: new Date("2026-07-18T00:00:00Z"),
  updated_at: new Date("2026-07-18T00:00:00Z"),
};

describe("tenant domain repository", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("finds an active tenant domain by normalized hostname", async () => {
    query.mockResolvedValueOnce({ rows: [row] });

    const result = await getActiveTenantDomainByHostname("HTTPS://SVTemple.TryTempleOS.com/login");

    expect(result).toEqual({
      id: "domain-1",
      tenantId: "tenant-1",
      hostname: "svtemple.trytempleos.com",
      kind: "primary",
      status: "active",
      createdAt: "2026-07-18T00:00:00.000Z",
      updatedAt: "2026-07-18T00:00:00.000Z",
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE hostname = $1 AND status = 'active'"),
      ["svtemple.trytempleos.com"],
    );
  });

  it("returns null for inactive or missing hostnames", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(getActiveTenantDomainByHostname("inactive.trytempleos.com")).resolves.toBeNull();
  });

  it("rejects generic and invalid hosts before querying", async () => {
    await expect(getActiveTenantDomainByHostname("trytempleos.com")).resolves.toBeNull();
    await expect(getActiveTenantDomainByHostname("www.trytempleos.com")).resolves.toBeNull();
    await expect(getActiveTenantDomainByHostname("localhost")).resolves.toBeNull();
    await expect(getActiveTenantDomainByHostname("not a host")).resolves.toBeNull();
    expect(query).not.toHaveBeenCalled();
  });
});
