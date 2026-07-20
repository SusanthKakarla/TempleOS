import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Mock } from "vitest";
import { getPool } from "./pool";
import {
  getTenantDetailForSuperAdmin,
  listTenantsForSuperAdmin,
  updateProvisionedTenantDetailsForSuperAdmin,
} from "./tenants";

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

const tenantRow = {
  id: "tenant-1",
  slug: "sv-temple",
  name: "Sri Venkateswara Temple",
  default_contact_phone: "+14155552671",
  address: "1 Temple Way",
  timezone: "America/Los_Angeles",
  welcome_message: null,
  description: null,
  history: null,
  contact_email: "info@svtemple.test",
  google_maps_link: null,
  morning_open: null,
  morning_close: null,
  evening_open: null,
  evening_close: null,
  created_at: new Date("2026-07-18T00:00:00Z"),
  updated_at: new Date("2026-07-18T08:00:00Z"),
};

const domainRow = {
  id: "domain-1",
  tenant_id: "tenant-1",
  hostname: "svtemple.trytempleos.com",
  kind: "primary",
  status: "active",
  created_at: new Date("2026-07-18T00:10:00Z"),
  updated_at: new Date("2026-07-18T00:10:00Z"),
};

const memberRow = {
  id: "membership-1",
  tenant_id: "tenant-1",
  person_id: "person-1",
  display_name: "Temple Admin",
  phone_number: "+14155552672",
  status: "active",
  role_codes: ["admin", "priest"],
  created_at: new Date("2026-07-18T00:20:00Z"),
  updated_at: new Date("2026-07-18T08:10:00Z"),
};

const whatsappRow = {
  id: "whatsapp-1",
  tenant_id: "tenant-1",
  phone_number: "+14155552673",
  meta_phone_number_id: "meta-phone-1",
  meta_business_account_id: "meta-business-1",
  business_name: null,
  phone_verification_status: null,
  webhook_subscribed: false,
  status: "connected",
  connected_at: new Date("2026-07-18T00:30:00Z"),
  disconnected_at: null,
  created_at: new Date("2026-07-18T00:30:00Z"),
  updated_at: new Date("2026-07-18T08:20:00Z"),
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

describe("tenant repository super-admin detail", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("returns tenant detail with primary domain, members with roles, and WhatsApp linkage", async () => {
    query
      .mockResolvedValueOnce({ rows: [tenantRow] })
      .mockResolvedValueOnce({ rows: [domainRow] })
      .mockResolvedValueOnce({ rows: [memberRow] })
      .mockResolvedValueOnce({ rows: [whatsappRow] });

    await expect(getTenantDetailForSuperAdmin("tenant-1")).resolves.toEqual({
      tenant: {
        id: "tenant-1",
        slug: "sv-temple",
        name: "Sri Venkateswara Temple",
        defaultContactPhone: "+14155552671",
        address: "1 Temple Way",
        timezone: "America/Los_Angeles",
        welcomeMessage: null,
        description: null,
        history: null,
        contactEmail: "info@svtemple.test",
        googleMapsLink: null,
        morningOpen: null,
        morningClose: null,
        eveningOpen: null,
        eveningClose: null,
        createdAt: "2026-07-18T00:00:00.000Z",
        updatedAt: "2026-07-18T08:00:00.000Z",
      },
      domain: {
        id: "domain-1",
        tenantId: "tenant-1",
        hostname: "svtemple.trytempleos.com",
        kind: "primary",
        status: "active",
        createdAt: "2026-07-18T00:10:00.000Z",
        updatedAt: "2026-07-18T00:10:00.000Z",
      },
      members: [
        {
          id: "membership-1",
          tenantId: "tenant-1",
          personId: "person-1",
          displayName: "Temple Admin",
          phoneNumber: "+14155552672",
          status: "active",
          roles: ["admin", "priest"],
          createdAt: "2026-07-18T00:20:00.000Z",
          updatedAt: "2026-07-18T08:10:00.000Z",
        },
      ],
      whatsappAccount: {
        id: "whatsapp-1",
        tenantId: "tenant-1",
        phoneNumber: "+14155552673",
        metaPhoneNumberId: "meta-phone-1",
        metaBusinessAccountId: "meta-business-1",
        businessName: null,
        phoneVerificationStatus: null,
        webhookSubscribed: false,
        status: "connected",
        connectedAt: "2026-07-18T00:30:00.000Z",
        disconnectedAt: null,
        createdAt: "2026-07-18T00:30:00.000Z",
        updatedAt: "2026-07-18T08:20:00.000Z",
      },
    });

    expect(query).toHaveBeenCalledTimes(4);
    expect(query.mock.calls[0][1]).toEqual(["tenant-1"]);
    expect(String(query.mock.calls[2][0])).toContain("tenant_memberships");
    expect(String(query.mock.calls[2][0])).toContain("persons");
    expect(String(query.mock.calls[2][0])).toContain("tenant_membership_roles");
    expect(String(query.mock.calls[2][0])).toContain("role_definitions");
    expect(String(query.mock.calls[2][0])).toContain("ORDER BY");
    expect(String(query.mock.calls[3][0])).toContain("whatsapp_accounts");
  });

  it("returns null for a missing tenant without reading unrelated detail rows", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(getTenantDetailForSuperAdmin("missing-tenant")).resolves.toBeNull();

    expect(query).toHaveBeenCalledTimes(1);
  });

  it("maps missing optional domain, member, and WhatsApp state without inventing data", async () => {
    query
      .mockResolvedValueOnce({ rows: [tenantRow] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(getTenantDetailForSuperAdmin("tenant-1")).resolves.toMatchObject({
      tenant: expect.objectContaining({ id: "tenant-1" }),
      domain: null,
      members: [],
      whatsappAccount: null,
    });
  });
});

describe("tenant repository super-admin safe update", () => {
  const query = vi.fn();

  beforeEach(() => {
    query.mockReset();
    (getPool as unknown as Mock).mockReturnValue({ query });
  });

  it("updates only safe provisioned temple fields through a caller-provided client", async () => {
    query.mockResolvedValueOnce({
      rows: [
        {
          ...tenantRow,
          name: "Updated Temple",
          default_contact_phone: "+14155559999",
          address: null,
          timezone: "Asia/Kolkata",
          updated_at: new Date("2026-07-19T00:00:00Z"),
        },
      ],
    });

    await expect(
      updateProvisionedTenantDetailsForSuperAdmin(
        "tenant-1",
        {
          name: "Updated Temple",
          defaultContactPhone: "+14155559999",
          address: null,
          timezone: "Asia/Kolkata",
        },
        { query },
      ),
    ).resolves.toMatchObject({
      id: "tenant-1",
      name: "Updated Temple",
      defaultContactPhone: "+14155559999",
      address: null,
      timezone: "Asia/Kolkata",
    });

    const sql = String(query.mock.calls[0][0]);
    expect(sql).toContain("UPDATE tenants");
    expect(sql).toContain("default_contact_phone");
    expect(sql).toContain("RETURNING *");
    expect(sql).not.toMatch(/slug|hostname|deleted|billing|imperson/i);
    expect(query.mock.calls[0][1]).toEqual([
      "tenant-1",
      "Updated Temple",
      true,
      "+14155559999",
      true,
      null,
      "Asia/Kolkata",
    ]);
  });

  it("returns null when the safe update target tenant does not exist", async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(
      updateProvisionedTenantDetailsForSuperAdmin("missing-tenant", { name: "Missing" }, { query }),
    ).resolves.toBeNull();
  });
});
