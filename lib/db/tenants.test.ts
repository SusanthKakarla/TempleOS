import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import { listTenantsForSuperAdmin } from "./tenants";

vi.mock("./pool", () => ({
  getPool: vi.fn(),
}));

const summaryRow = {
  id: "tenant-1",
  slug: "sv-temple",
  name: "Sri Venkateswara Temple",
  primary_hostname: "svtemple.trytempleos.com",
  primary_admin_name: "Temple Admin",
  primary_admin_phone_number: "+14155552672",
  active_member_count: "2",
  whatsapp_status: "linked",
  last_updated_at: new Date("2026-07-18T08:00:00Z"),
};

describe("tenant repository super-admin list", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("lists cross-tenant summaries for super-admin operations", async () => {
    query.mockResolvedValueOnce({ rows: [summaryRow] });

    await expect(listTenantsForSuperAdmin()).resolves.toEqual([
      {
        id: "tenant-1",
        slug: "sv-temple",
        name: "Sri Venkateswara Temple",
        primaryHostname: "svtemple.trytempleos.com",
        primaryAdminName: "Temple Admin",
        primaryAdminPhoneNumber: "+14155552672",
        activeMemberCount: 2,
        whatsappStatus: "linked",
        lastUpdatedAt: "2026-07-18T08:00:00.000Z",
      },
    ]);

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("FROM tenants t");
    expect(sql).toContain("tenant_domains");
    expect(sql).toContain("tenant_memberships");
    expect(sql).toContain("tenant_membership_roles");
    expect(sql).toContain("role_definitions");
    expect(sql).toContain("whatsapp_accounts");
    expect(sql).toContain("role_assigned_at");
    expect(sql).toContain("latest_member_updated_at");
    expect(sql).toContain("ORDER BY");
  });

  it("maps missing optional state without inventing domain, admin, or WhatsApp data", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          ...summaryRow,
          primary_hostname: null,
          primary_admin_name: null,
          primary_admin_phone_number: null,
          active_member_count: 0,
          whatsapp_status: "unlinked",
          last_updated_at: null,
        },
      ],
    });

    await expect(listTenantsForSuperAdmin()).resolves.toEqual([
      {
        id: "tenant-1",
        slug: "sv-temple",
        name: "Sri Venkateswara Temple",
        primaryHostname: null,
        primaryAdminName: null,
        primaryAdminPhoneNumber: null,
        activeMemberCount: 0,
        whatsappStatus: "unlinked",
        lastUpdatedAt: null,
      },
    ]);
  });
});
