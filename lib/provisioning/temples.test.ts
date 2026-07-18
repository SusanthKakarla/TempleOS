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
}));

vi.mock("@/lib/db/whatsapp-accounts", () => ({
  linkWhatsAppAccountForProvisioning: vi.fn(),
}));

vi.mock("@/lib/db/audit-log", () => ({
  createAuditLogEntry: vi.fn(),
}));

import { normalizeTenantHostname } from "@/lib/tenant-domains";
import { getPool } from "@/lib/db/pool";
import { createTenantForSuperAdmin } from "@/lib/db/tenants";
import { createTenantDomainForSuperAdmin } from "@/lib/db/tenant-domains";
import { findOrCreatePersonByPhoneForProvisioning } from "@/lib/db/persons";
import {
  assignTenantMembershipRolesForProvisioning,
  createTenantMembershipForProvisioning,
  type TenantMembershipWithRoles,
} from "@/lib/db/tenant-memberships";
import { linkWhatsAppAccountForProvisioning } from "@/lib/db/whatsapp-accounts";
import { createAuditLogEntry } from "@/lib/db/audit-log";
import {
  isReservedTenantSubdomain,
  parseProvisionTempleInput,
  PRODUCT_DOMAIN,
  provisionTemple,
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
  vi.mocked(createTenantDomainForSuperAdmin).mockResolvedValue(createdDomain);
  vi.mocked(findOrCreatePersonByPhoneForProvisioning).mockResolvedValue(createdPerson);
  vi.mocked(createTenantMembershipForProvisioning).mockResolvedValue(createdMembership);
  vi.mocked(assignTenantMembershipRolesForProvisioning).mockResolvedValue(createdMembership);
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
