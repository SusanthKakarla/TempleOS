import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tenant-domains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tenant-domains")>();
  return {
    ...actual,
    normalizeTenantHostname: vi.fn(actual.normalizeTenantHostname),
  };
});

vi.mock("@/lib/db/pool", () => ({
  getPool: vi.fn(),
}));

vi.mock("@/lib/db/tenants", () => ({
  createTenantForSuperAdmin: vi.fn(),
  getTenantDetailForSuperAdmin: vi.fn(),
  updateProvisionedTenantDetailsForSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/db/tenant-domains", () => ({
  createTenantDomainForSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/db/persons", () => ({
  findOrCreatePersonByPhoneForProvisioning: vi.fn(),
}));

vi.mock("@/lib/db/tenant-memberships", () => ({
  assignTenantMembershipRolesForProvisioning: vi.fn(),
  createTenantMembershipForProvisioning: vi.fn(),
  getTenantMembershipByTenantAndIdForSuperAdmin: vi.fn(),
  replaceTenantMembershipRolesForSuperAdmin: vi.fn(),
}));

vi.mock("@/lib/db/whatsapp-accounts", () => ({
  linkWhatsAppAccountForProvisioning: vi.fn(),
}));

vi.mock("@/lib/db/audit-log", () => ({
  createAuditLogEntry: vi.fn(),
}));

vi.mock("@/lib/db/role-definitions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/role-definitions")>();
  return {
    ...actual,
    listActiveRoleCodesForSuperAdmin: vi.fn(),
  };
});

import { normalizeTenantHostname } from "@/lib/tenant-domains";
import { getPool } from "@/lib/db/pool";
import { listActiveRoleCodesForSuperAdmin } from "@/lib/db/role-definitions";
import {
  createTenantForSuperAdmin,
  getTenantDetailForSuperAdmin,
  updateProvisionedTenantDetailsForSuperAdmin,
} from "@/lib/db/tenants";
import { createTenantDomainForSuperAdmin } from "@/lib/db/tenant-domains";
import { findOrCreatePersonByPhoneForProvisioning } from "@/lib/db/persons";
import {
  assignTenantMembershipRolesForProvisioning,
  createTenantMembershipForProvisioning,
  getTenantMembershipByTenantAndIdForSuperAdmin,
  replaceTenantMembershipRolesForSuperAdmin,
  type TenantMembershipWithRoles,
} from "@/lib/db/tenant-memberships";
import { linkWhatsAppAccountForProvisioning } from "@/lib/db/whatsapp-accounts";
import { createAuditLogEntry } from "@/lib/db/audit-log";
import {
  isReservedTenantSubdomain,
  parseProvisionTempleInput,
  PRODUCT_DOMAIN,
  provisionTemple,
  assignTenantMemberRoles,
  parseAssignTenantMemberRolesInput,
  parseUpdateProvisionedTempleInput,
  updateProvisionedTemple,
  UpdateProvisionedTempleError,
  RESERVED_TENANT_SUBDOMAINS,
} from "./temples";

const validRawInput = {
  tenant: {
    name: "Sri Venkateswara Temple",
    slug: "sv-temple",
    defaultContactPhone: "7995362200",
    address: "123 Temple Street",
    timezone: "Asia/Kolkata",
    uiOnlyDraftId: "draft-123",
  },
  domain: {
    subdomain: "sv-temple",
    generatedPreview: "SV-Temple.TryTempleOS.com",
  },
  firstMember: {
    phoneNumber: "8886655443",
    displayName: "Temple Admin",
    roles: ["admin", "priest", "admin"],
    formSectionExpanded: true,
  },
  whatsappAccount: {
    phoneNumber: "9876543210",
    metaPhoneNumberId: "123456789",
    metaBusinessAccountId: "987654321",
    embeddedSignupState: "ignored",
  },
  uiStep: "review",
};

const actor = {
  type: "super_admin" as const,
  superAdminId: "super-admin-1",
  phoneNumber: "+14155550100",
  displayName: "Root Admin",
};

const createdTenant = {
  id: "tenant-1",
  slug: "sv-temple",
  name: "Sri Venkateswara Temple",
  defaultContactPhone: "+917995362200",
  address: "123 Temple Street",
  timezone: "Asia/Kolkata",
  welcomeMessage: null,
  description: null,
  history: null,
  contactEmail: null,
  googleMapsLink: null,
  morningOpen: null,
  morningClose: null,
  eveningOpen: null,
  eveningClose: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const createdDomain = {
  id: "domain-1",
  tenantId: "tenant-1",
  hostname: "sv-temple.trytempleos.com",
  kind: "primary" as const,
  status: "active" as const,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const createdPerson = {
  id: "person-1",
  phoneNumber: "+918886655443",
  displayName: "Temple Admin",
  firebaseUid: null,
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const createdMembership: TenantMembershipWithRoles = {
  id: "membership-1",
  tenantId: "tenant-1",
  personId: "person-1",
  displayName: "Temple Admin",
  status: "active" as const,
  roles: ["admin", "priest"],
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const linkedWhatsAppAccount = {
  id: "whatsapp-1",
  tenantId: "tenant-1",
  phoneNumber: "+919876543210",
  metaPhoneNumberId: "123456789",
  metaBusinessAccountId: "987654321",
  status: "connected" as const,
  connectedAt: "2026-07-18T00:00:00.000Z",
  createdAt: "2026-07-18T00:00:00.000Z",
  updatedAt: "2026-07-18T00:00:00.000Z",
};

const client = {
  query: vi.fn(),
  release: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  client.query.mockReset();
  client.release.mockReset();
  vi.mocked(getPool).mockReturnValue({ connect: vi.fn().mockResolvedValue(client) } as never);
  vi.mocked(createTenantForSuperAdmin).mockResolvedValue(createdTenant);
  vi.mocked(updateProvisionedTenantDetailsForSuperAdmin).mockResolvedValue(createdTenant);
  vi.mocked(getTenantDetailForSuperAdmin).mockResolvedValue({
    tenant: createdTenant,
    domain: createdDomain,
    members: [{ ...createdMembership, phoneNumber: createdPerson.phoneNumber }],
    whatsappAccount: linkedWhatsAppAccount,
  });
  vi.mocked(createTenantDomainForSuperAdmin).mockResolvedValue(createdDomain);
  vi.mocked(findOrCreatePersonByPhoneForProvisioning).mockResolvedValue(createdPerson);
  vi.mocked(createTenantMembershipForProvisioning).mockResolvedValue(createdMembership);
  vi.mocked(assignTenantMembershipRolesForProvisioning).mockResolvedValue(createdMembership);
  vi.mocked(getTenantMembershipByTenantAndIdForSuperAdmin).mockResolvedValue(createdMembership);
  vi.mocked(listActiveRoleCodesForSuperAdmin).mockImplementation(async (roles) => Array.from(new Set(roles)));
  vi.mocked(replaceTenantMembershipRolesForSuperAdmin).mockResolvedValue({
    ...createdMembership,
    roles: ["admin", "volunteer"],
  });
  vi.mocked(linkWhatsAppAccountForProvisioning).mockResolvedValue(linkedWhatsAppAccount);
  vi.mocked(createAuditLogEntry).mockResolvedValue({ id: "audit-1" } as never);
  client.query.mockResolvedValue({ rows: [] });
});

describe("canonical temple provisioning contract", () => {
  it("maps raw API/UI/CLI-shaped input to the canonical ProvisionTempleInput shape", () => {
    const result = parseProvisionTempleInput(validRawInput);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected validation success");

    expect(result.data).toEqual({
      tenant: {
        name: "Sri Venkateswara Temple",
        slug: "sv-temple",
        defaultContactPhone: "+917995362200",
        address: "123 Temple Street",
        timezone: "Asia/Kolkata",
      },
      domain: {
        subdomain: "sv-temple",
        hostname: `sv-temple.${PRODUCT_DOMAIN}`,
      },
      firstMember: {
        phoneNumber: "+918886655443",
        displayName: "Temple Admin",
        roles: ["admin", "priest"],
      },
      whatsappAccount: {
        phoneNumber: "+919876543210",
        metaPhoneNumberId: "123456789",
        metaBusinessAccountId: "987654321",
      },
    });
    expect(result.data).not.toHaveProperty("uiStep");
    expect(result.data.tenant).not.toHaveProperty("uiOnlyDraftId");
    expect(result.data.domain).not.toHaveProperty("generatedPreview");
    expect(result.data.firstMember).not.toHaveProperty("formSectionExpanded");
    expect(result.data.whatsappAccount).not.toHaveProperty("embeddedSignupState");
    expect(vi.mocked(normalizeTenantHostname)).toHaveBeenCalledWith(`sv-temple.${PRODUCT_DOMAIN}`);
  });

  it("keeps tenant.slug in the canonical output", () => {
    const result = parseProvisionTempleInput(validRawInput);

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected validation success");
    expect(result.data.tenant.slug).toBe("sv-temple");
  });

  it("rejects reserved and malformed subdomains before composing a hostname", () => {
    for (const subdomain of ["www", "admin", "super-admin", "api", "localhost"]) {
      const result = parseProvisionTempleInput({
        ...validRawInput,
        domain: { subdomain },
        tenant: { ...validRawInput.tenant, slug: subdomain },
      });

      expect(result).toMatchObject({
        ok: false,
        status: 400,
        code: "VALIDATION_ERROR",
      });
      if (!result.ok) {
        expect(result.errors.some((error) => error.path.join(".") === "domain.subdomain")).toBe(
          true,
        );
      }
    }

    for (const subdomain of ["-bad", "bad-", "bad_name", "BadName", "not a host"]) {
      const result = parseProvisionTempleInput({
        ...validRawInput,
        domain: { subdomain },
        tenant: { ...validRawInput.tenant, slug: subdomain },
      });
      expect(result.ok).toBe(false);
    }

    expect(RESERVED_TENANT_SUBDOMAINS).toEqual([
      "www",
      "admin",
      "super-admin",
      "api",
      "localhost",
      "trytempleos",
      "trytempleos.com",
    ]);
    expect(isReservedTenantSubdomain("localhost")).toBe(true);
  });

  it("requires first member roles to include admin and rejects unknown role codes", () => {
    const missingAdmin = parseProvisionTempleInput({
      ...validRawInput,
      firstMember: { ...validRawInput.firstMember, roles: ["priest"] },
    });
    expect(missingAdmin).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!missingAdmin.ok) {
      expect(missingAdmin.errors).toContainEqual(
        expect.objectContaining({ path: ["firstMember", "roles"] }),
      );
    }

    const unknownRole = parseProvisionTempleInput({
      ...validRawInput,
      firstMember: { ...validRawInput.firstMember, roles: ["admin", "owner"] },
    });
    expect(unknownRole).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!unknownRole.ok) {
      expect(unknownRole.errors).toContainEqual(
        expect.objectContaining({ path: ["firstMember", "roles"] }),
      );
    }
    expect(unknownRole).toMatchObject({
      ok: false,
      errors: [expect.objectContaining({ message: "Unknown role code: owner" })],
    });
  });

  it("rejects invalid tenant timezones before future runtime formatting", () => {
    const result = parseProvisionTempleInput({
      ...validRawInput,
      tenant: { ...validRawInput.tenant, timezone: "Mars/Base" },
    });

    expect(result).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!result.ok) {
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: ["tenant", "timezone"] }),
      );
    }
  });

  it("returns validation errors for invalid phone inputs that routes can map to 400", () => {
    const result = parseProvisionTempleInput({
      ...validRawInput,
      tenant: { ...validRawInput.tenant, defaultContactPhone: "123" },
      firstMember: { ...validRawInput.firstMember, phoneNumber: "not-phone" },
      whatsappAccount: { ...validRawInput.whatsappAccount, phoneNumber: "bad" },
    });

    expect(result).toMatchObject({
      ok: false,
      status: 400,
      code: "VALIDATION_ERROR",
    });
    if (!result.ok) {
      expect(result.errors.map((error) => error.path.join("."))).toEqual(
        expect.arrayContaining([
          "tenant.defaultContactPhone",
          "firstMember.phoneNumber",
          "whatsappAccount.phoneNumber",
        ]),
      );
    }
  });

  it("allows optional nullable contact and omitted WhatsApp input", () => {
    const result = parseProvisionTempleInput({
      ...validRawInput,
      tenant: { ...validRawInput.tenant, defaultContactPhone: "" },
      whatsappAccount: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected validation success");
    expect(result.data.tenant.defaultContactPhone).toBeNull();
    expect(result.data).not.toHaveProperty("whatsappAccount");
  });

  it("omits optional tenant fields when callers omit them", () => {
    const result = parseProvisionTempleInput({
      ...validRawInput,
      tenant: {
        name: validRawInput.tenant.name,
        slug: validRawInput.tenant.slug,
        timezone: validRawInput.tenant.timezone,
      },
      whatsappAccount: undefined,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected validation success");
    expect(result.data.tenant).not.toHaveProperty("defaultContactPhone");
    expect(result.data.tenant).not.toHaveProperty("address");
    expect(result.data).not.toHaveProperty("whatsappAccount");
  });

  it("keeps provisioning contract source away from pilot and auth footguns", () => {
    const source = readFileSync(path.join(process.cwd(), "lib/provisioning/temples.ts"), "utf8");

    expect(source).not.toMatch(/getPilotTenant|admin-users|admin_users/);
    expect(source).not.toMatch(/requireTenantAdminSession|getSessionAdmin|templeos_session/);
    expect(source).not.toMatch(/requireSuperAdmin|app\/api\/super-admin/);
    expect(source).not.toMatch(/upsertWhatsAppAccount/);
    expect(source).toMatch(/V0_ROLE_DEFINITIONS/);
  });

  it("creates the complete tenant shape inside one transaction", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");

    const result = await provisionTemple(parsed.data, actor);

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(createTenantForSuperAdmin).toHaveBeenCalledWith(parsed.data.tenant, client);
    expect(createTenantDomainForSuperAdmin).toHaveBeenCalledWith(
      { tenantId: "tenant-1", hostname: parsed.data.domain.hostname },
      client,
    );
    expect(findOrCreatePersonByPhoneForProvisioning).toHaveBeenCalledWith(
      {
        phoneNumber: parsed.data.firstMember.phoneNumber,
        displayName: parsed.data.firstMember.displayName,
      },
      client,
    );
    expect(createTenantMembershipForProvisioning).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        personId: "person-1",
        displayName: parsed.data.firstMember.displayName,
      },
      client,
    );
    expect(assignTenantMembershipRolesForProvisioning).toHaveBeenCalledWith(
      { membershipId: "membership-1", roles: ["admin", "priest"] },
      client,
    );
    expect(linkWhatsAppAccountForProvisioning).toHaveBeenCalledWith(
      { tenantId: "tenant-1", ...parsed.data.whatsappAccount },
      client,
    );
    expect(createAuditLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "super_admin",
        actorId: "super-admin-1",
        tenantId: "tenant-1",
        action: "temple.provisioned",
        targetType: "tenant",
        targetId: "tenant-1",
      }),
      client,
    );
    expect(client.query).toHaveBeenLastCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
    expect(result).toEqual({
      tenant: createdTenant,
      domain: createdDomain,
      firstMember: createdMembership,
      roles: ["admin", "priest"],
      whatsappAccount: linkedWhatsAppAccount,
    });
  });

  it("reuses an existing person when creating the first tenant membership", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(findOrCreatePersonByPhoneForProvisioning).mockResolvedValueOnce({
      ...createdPerson,
      id: "existing-person-1",
    });

    await provisionTemple(parsed.data, actor);

    expect(createTenantMembershipForProvisioning).toHaveBeenCalledWith(
      {
        tenantId: "tenant-1",
        personId: "existing-person-1",
        displayName: parsed.data.firstMember.displayName,
      },
      client,
    );
  });

  it("sanitizes raw runtime input before repository writes", async () => {
    await provisionTemple(validRawInput as never, actor);

    expect(createTenantForSuperAdmin).toHaveBeenCalledWith(
      {
        name: "Sri Venkateswara Temple",
        slug: "sv-temple",
        defaultContactPhone: "+917995362200",
        address: "123 Temple Street",
        timezone: "Asia/Kolkata",
      },
      client,
    );
  });

  it("rolls back and releases the transaction client on write failure", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(createTenantDomainForSuperAdmin).mockRejectedValueOnce(new Error("domain failed"));

    await expect(provisionTemple(parsed.data, actor)).rejects.toMatchObject({
      status: 500,
      code: "PROVISIONING_FAILED",
    });

    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
    expect(client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(createAuditLogEntry).not.toHaveBeenCalled();
  });

  it("rolls back and does not report success when audit logging fails after entity writes", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(createAuditLogEntry).mockRejectedValueOnce(new Error("audit failed"));

    await expect(provisionTemple(parsed.data, actor)).rejects.toMatchObject({
      status: 500,
      code: "PROVISIONING_FAILED",
    });

    expect(createTenantForSuperAdmin).toHaveBeenCalled();
    expect(createTenantDomainForSuperAdmin).toHaveBeenCalled();
    expect(findOrCreatePersonByPhoneForProvisioning).toHaveBeenCalled();
    expect(createTenantMembershipForProvisioning).toHaveBeenCalled();
    expect(assignTenantMembershipRolesForProvisioning).toHaveBeenCalled();
    expect(linkWhatsAppAccountForProvisioning).toHaveBeenCalled();
    expect(createAuditLogEntry).toHaveBeenCalledOnce();
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("preserves the original stable provisioning error when rollback fails", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(createTenantDomainForSuperAdmin).mockRejectedValueOnce(new Error("domain failed"));
    client.query.mockImplementation((sql: string) => {
      if (sql === "ROLLBACK") return Promise.reject(new Error("rollback failed"));
      return Promise.resolve({ rows: [] });
    });

    await expect(provisionTemple(parsed.data, actor)).rejects.toMatchObject({
      status: 500,
      code: "PROVISIONING_FAILED",
    });
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("maps unique violations to stable provisioning conflicts", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(createTenantForSuperAdmin).mockRejectedValueOnce({
      code: "23505",
      constraint: "tenants_slug_key",
    });

    await expect(provisionTemple(parsed.data, actor)).rejects.toMatchObject({
      status: 409,
      code: "PROVISIONING_CONFLICT",
      field: "tenant.slug",
    });
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("maps duplicate hostnames to stable provisioning conflicts", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(createTenantDomainForSuperAdmin).mockRejectedValueOnce({
      code: "23505",
      constraint: "tenant_domains_hostname_key",
    });

    await expect(provisionTemple(parsed.data, actor)).rejects.toMatchObject({
      status: 409,
      code: "PROVISIONING_CONFLICT",
      field: "domain.hostname",
    });
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("maps duplicate first-member membership to a stable conflict field", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(createTenantMembershipForProvisioning).mockRejectedValueOnce({
      code: "23505",
      constraint: "tenant_memberships_tenant_id_person_id_key",
    });

    await expect(provisionTemple(parsed.data, actor)).rejects.toMatchObject({
      status: 409,
      code: "PROVISIONING_CONFLICT",
      field: "firstMember.phoneNumber",
    });
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(createAuditLogEntry).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("maps duplicate tenant WhatsApp linkage to a stable conflict field", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(linkWhatsAppAccountForProvisioning).mockRejectedValueOnce({
      code: "23505",
      constraint: "whatsapp_accounts_tenant_id_unique",
    });

    await expect(provisionTemple(parsed.data, actor)).rejects.toMatchObject({
      status: 409,
      code: "PROVISIONING_CONFLICT",
      field: "whatsappAccount.tenantId",
    });
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(createAuditLogEntry).not.toHaveBeenCalled();
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("maps duplicate Meta phone number IDs to stable provisioning conflicts without reassignment", async () => {
    const parsed = parseProvisionTempleInput(validRawInput);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");
    vi.mocked(linkWhatsAppAccountForProvisioning).mockRejectedValueOnce({
      code: "23505",
      constraint: "whatsapp_accounts_meta_phone_number_id_key",
    });

    await expect(provisionTemple(parsed.data, actor)).rejects.toMatchObject({
      status: 409,
      code: "PROVISIONING_CONFLICT",
      field: "whatsappAccount.metaPhoneNumberId",
    });
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });
});

describe("canonical provisioned temple update contract", () => {
  const tenantId = "tenant-1";

  it("maps safe raw update input to the canonical UpdateProvisionedTempleInput shape", () => {
    const result = parseUpdateProvisionedTempleInput(
      {
        tenant: {
          name: " Updated Temple ",
          defaultContactPhone: "7995362200",
          address: "  ",
          timezone: "Asia/Kolkata",
        },
      },
      tenantId,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected validation success");
    expect(result.data).toEqual({
      tenantId,
      tenant: {
        name: "Updated Temple",
        defaultContactPhone: "+917995362200",
        address: null,
        timezone: "Asia/Kolkata",
      },
    });
  });

  it("rejects blocked lifecycle and domain fields before writes", () => {
    const result = parseUpdateProvisionedTempleInput(
      {
        tenant: {
          name: "Updated Temple",
          slug: "new-slug",
          deletedAt: "2026-07-19",
        },
        domain: { hostname: "other.trytempleos.com" },
        billing: { plan: "paid" },
        impersonation: true,
        transfer: { owner: "new-owner" },
      },
      tenantId,
    );

    expect(result).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!result.ok) {
      expect(result.errors.map((error) => error.path.join("."))).toEqual(
        expect.arrayContaining([
          "tenant.slug",
          "tenant.deletedAt",
          "domain",
          "billing",
          "impersonation",
          "transfer",
        ]),
      );
    }
  });

  it("rejects invalid phone, unsupported timezone, and empty safe updates", () => {
    const invalidPhone = parseUpdateProvisionedTempleInput(
      { tenant: { defaultContactPhone: "123" } },
      tenantId,
    );
    expect(invalidPhone).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!invalidPhone.ok) {
      expect(invalidPhone.errors).toContainEqual(
        expect.objectContaining({ path: ["tenant", "defaultContactPhone"] }),
      );
    }

    const invalidTimezone = parseUpdateProvisionedTempleInput(
      { tenant: { timezone: "Mars/Base" } },
      tenantId,
    );
    expect(invalidTimezone).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!invalidTimezone.ok) {
      expect(invalidTimezone.errors).toContainEqual(
        expect.objectContaining({ path: ["tenant", "timezone"] }),
      );
    }

    const empty = parseUpdateProvisionedTempleInput({ tenant: {} }, tenantId);
    expect(empty).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!empty.ok) {
      expect(empty.errors).toContainEqual(expect.objectContaining({ path: ["tenant"] }));
    }
  });

  it("updates safe fields and writes audit metadata inside one transaction", async () => {
    vi.mocked(getTenantDetailForSuperAdmin)
      .mockResolvedValueOnce({
        tenant: {
          ...createdTenant,
          name: "Original Temple",
          defaultContactPhone: "+14155552671",
          address: "Old Address",
          timezone: "UTC",
        },
        domain: createdDomain,
        members: [{ ...createdMembership, phoneNumber: createdPerson.phoneNumber }],
        whatsappAccount: linkedWhatsAppAccount,
      })
      .mockResolvedValueOnce({
        tenant: createdTenant,
        domain: createdDomain,
        members: [{ ...createdMembership, phoneNumber: createdPerson.phoneNumber }],
        whatsappAccount: linkedWhatsAppAccount,
      });
    const parsed = parseUpdateProvisionedTempleInput(
      {
        tenant: {
          name: "Updated Temple",
          defaultContactPhone: "+1 415 555 9999",
          address: null,
          timezone: "America/Los_Angeles",
        },
      },
      tenantId,
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("expected validation success");

    const result = await updateProvisionedTemple(parsed.data, actor);

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(updateProvisionedTenantDetailsForSuperAdmin).toHaveBeenCalledWith(parsed.data.tenantId, parsed.data.tenant, client);
    expect(createAuditLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "super_admin",
        actorId: "super-admin-1",
        tenantId,
        action: "temple.updated",
        targetType: "tenant",
        targetId: tenantId,
        metadata: {
          changedFields: ["name", "defaultContactPhone", "address", "timezone"],
        },
      }),
      client,
    );
    expect(getTenantDetailForSuperAdmin).toHaveBeenCalledWith(tenantId, client);
    expect(client.query).toHaveBeenLastCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
    expect(result.tenant.name).toBe(createdTenant.name);
  });

  it("returns current detail without update or audit for no-op safe submissions", async () => {
    vi.mocked(getTenantDetailForSuperAdmin).mockResolvedValueOnce({
      tenant: {
        ...createdTenant,
        name: "Updated Temple",
        defaultContactPhone: "+14155559999",
        address: null,
        timezone: "America/Los_Angeles",
      },
      domain: createdDomain,
      members: [{ ...createdMembership, phoneNumber: createdPerson.phoneNumber }],
      whatsappAccount: linkedWhatsAppAccount,
    });

    const result = await updateProvisionedTemple(
      {
        tenantId,
        tenant: {
          name: "Updated Temple",
          defaultContactPhone: "+14155559999",
          address: null,
          timezone: "America/Los_Angeles",
        },
      },
      actor,
    );

    expect(updateProvisionedTenantDetailsForSuperAdmin).not.toHaveBeenCalled();
    expect(createAuditLogEntry).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenLastCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
    expect(result.tenant.name).toBe("Updated Temple");
  });

  it("returns a stable not-found error without audit when the tenant is missing", async () => {
    vi.mocked(getTenantDetailForSuperAdmin).mockResolvedValueOnce(null);

    let caught: unknown;
    try {
      await updateProvisionedTemple({ tenantId, tenant: { name: "Missing" } }, actor);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(UpdateProvisionedTempleError);
    expect(caught).toMatchObject({ status: 404, code: "TEMPLE_NOT_FOUND" });

    expect(updateProvisionedTenantDetailsForSuperAdmin).not.toHaveBeenCalled();
    expect(createAuditLogEntry).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("rolls back when audit logging fails after the tenant update", async () => {
    vi.mocked(createAuditLogEntry).mockRejectedValueOnce(new Error("audit failed"));

    await expect(
      updateProvisionedTemple({ tenantId, tenant: { name: "Updated Temple" } }, actor),
    ).rejects.toMatchObject({ status: 500, code: "TEMPLE_UPDATE_FAILED" });

    expect(updateProvisionedTenantDetailsForSuperAdmin).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("requires a super-admin actor for updates", async () => {
    await expect(
      updateProvisionedTemple({ tenantId, tenant: { name: "Updated Temple" } }, { ...actor, type: "tenant_member" } as never),
    ).rejects.toMatchObject({ status: 500, code: "TEMPLE_UPDATE_FAILED" });
    expect(updateProvisionedTenantDetailsForSuperAdmin).not.toHaveBeenCalled();
  });
});

describe("super-admin tenant member role assignment", () => {
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const membershipId = "22222222-2222-4222-8222-222222222222";

  it("parses role assignment input and de-duplicates valid V0 role codes", () => {
    const result = parseAssignTenantMemberRolesInput(
      { roles: ["volunteer", "admin", "volunteer"] },
      tenantId,
      membershipId,
    );

    expect(result).toEqual({
      ok: true,
      data: {
        tenantId,
        membershipId,
        roles: ["volunteer", "admin"],
      },
    });
  });

  it("rejects malformed IDs, missing roles, and unknown role codes", () => {
    const result = parseAssignTenantMemberRolesInput(
      { roles: ["admin", "owner"] },
      "not-a-uuid",
      "also-not-a-uuid",
    );

    expect(result).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!result.ok) {
      expect(result.errors.map((error) => error.path.join("."))).toEqual(
        expect.arrayContaining(["tenantId", "membershipId", "roles"]),
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({ path: ["roles"], message: "Unknown role code: owner" }),
      );
    }

    const missingRoles = parseAssignTenantMemberRolesInput({}, tenantId, membershipId);
    expect(missingRoles).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
  });

  it("rejects extra role-assignment body fields", () => {
    const result = parseAssignTenantMemberRolesInput(
      {
        roles: ["admin"],
        tenantId,
        personId: "person-1",
        auditActorId: "attacker",
      },
      tenantId,
      membershipId,
    );

    expect(result).toMatchObject({ ok: false, status: 400, code: "VALIDATION_ERROR" });
    if (!result.ok) {
      expect(result.errors.map((error) => error.path.join("."))).toContain("roles");
    }
  });

  it("replaces tenant-scoped member roles and writes audit metadata inside one transaction", async () => {
    const previousMembership: TenantMembershipWithRoles = {
      ...createdMembership,
      id: membershipId,
      tenantId,
      roles: ["admin", "priest"],
    };
    const updatedMembership: TenantMembershipWithRoles = {
      ...createdMembership,
      id: membershipId,
      tenantId,
      roles: ["admin", "volunteer"],
    };
    vi.mocked(getTenantMembershipByTenantAndIdForSuperAdmin).mockResolvedValueOnce(previousMembership);
    vi.mocked(replaceTenantMembershipRolesForSuperAdmin).mockResolvedValueOnce(updatedMembership);
    vi.mocked(getTenantDetailForSuperAdmin).mockResolvedValueOnce({
      tenant: { ...createdTenant, id: tenantId },
      domain: createdDomain,
      members: [{ ...updatedMembership, phoneNumber: createdPerson.phoneNumber }],
      whatsappAccount: linkedWhatsAppAccount,
    });

    const result = await assignTenantMemberRoles(
      { tenantId, membershipId, roles: ["admin", "volunteer", "admin"] },
      actor,
    );

    expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
    expect(getTenantMembershipByTenantAndIdForSuperAdmin).toHaveBeenCalledWith(
      { tenantId, membershipId },
      client,
    );
    expect(replaceTenantMembershipRolesForSuperAdmin).toHaveBeenCalledWith(
      { tenantId, membershipId, roles: ["admin", "volunteer"] },
      client,
    );
    expect(createAuditLogEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        actorType: "super_admin",
        actorId: "super-admin-1",
        tenantId,
        action: "tenant_member.roles_assigned",
        targetType: "tenant_membership",
        targetId: membershipId,
        metadata: {
          assignedRoles: ["volunteer"],
          removedRoles: ["priest"],
          roles: ["admin", "volunteer"],
        },
      }),
      client,
    );
    expect(getTenantDetailForSuperAdmin).toHaveBeenCalledWith(tenantId, client);
    expect(client.query).toHaveBeenLastCalledWith("COMMIT");
    expect(result.members[0]).toMatchObject({ id: membershipId, tenantId, roles: ["admin", "volunteer"] });
  });

  it("returns a stable not-found error for cross-tenant or inactive memberships without role writes", async () => {
    vi.mocked(getTenantMembershipByTenantAndIdForSuperAdmin).mockResolvedValueOnce(null);

    await expect(
      assignTenantMemberRoles({ tenantId, membershipId, roles: ["admin"] }, actor),
    ).rejects.toMatchObject({ status: 404, code: "MEMBER_NOT_FOUND" });

    expect(replaceTenantMembershipRolesForSuperAdmin).not.toHaveBeenCalled();
    expect(createAuditLogEntry).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("returns validation errors before opening a transaction for unknown role codes", async () => {
    await expect(
      assignTenantMemberRoles({ tenantId, membershipId, roles: ["owner" as never] }, actor),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });

    expect(getPool).not.toHaveBeenCalled();
    expect(replaceTenantMembershipRolesForSuperAdmin).not.toHaveBeenCalled();
  });

  it("rejects inactive database role definitions before replacement or audit writes", async () => {
    vi.mocked(listActiveRoleCodesForSuperAdmin).mockResolvedValueOnce(["admin"]);

    await expect(
      assignTenantMemberRoles({ tenantId, membershipId, roles: ["admin", "priest"] }, actor),
    ).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
      errors: [{ path: ["roles"], message: "Inactive role code: priest" }],
    });

    expect(listActiveRoleCodesForSuperAdmin).toHaveBeenCalledWith(["admin", "priest"], client);
    expect(replaceTenantMembershipRolesForSuperAdmin).not.toHaveBeenCalled();
    expect(createAuditLogEntry).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
  });

  it("rolls back when audit logging fails after role replacement", async () => {
    vi.mocked(createAuditLogEntry).mockRejectedValueOnce(new Error("audit failed"));

    await expect(
      assignTenantMemberRoles({ tenantId, membershipId, roles: ["admin", "volunteer"] }, actor),
    ).rejects.toMatchObject({ status: 500, code: "ROLE_ASSIGNMENT_FAILED" });

    expect(replaceTenantMembershipRolesForSuperAdmin).toHaveBeenCalled();
    expect(client.query).toHaveBeenCalledWith("ROLLBACK");
    expect(client.query).not.toHaveBeenCalledWith("COMMIT");
    expect(client.release).toHaveBeenCalledOnce();
  });

  it("requires a super-admin actor for role assignment", async () => {
    await expect(
      assignTenantMemberRoles(
        { tenantId, membershipId, roles: ["admin"] },
        { ...actor, type: "tenant_member" } as never,
      ),
    ).rejects.toMatchObject({ status: 500, code: "ROLE_ASSIGNMENT_FAILED" });

    expect(getTenantMembershipByTenantAndIdForSuperAdmin).not.toHaveBeenCalled();
  });
});
