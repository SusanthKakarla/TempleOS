import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tenant-domains", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/tenant-domains")>();
  return {
    ...actual,
    normalizeTenantHostname: vi.fn(actual.normalizeTenantHostname),
  };
});

import { normalizeTenantHostname } from "@/lib/tenant-domains";
import {
  isReservedTenantSubdomain,
  parseProvisionTempleInput,
  PRODUCT_DOMAIN,
  RESERVED_TENANT_SUBDOMAINS,
  TENANT_SLUG_PERSISTENCE_GAP,
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

  it("keeps tenant.slug in the canonical output and documents the current schema gap", () => {
    const result = parseProvisionTempleInput(validRawInput);

    expect(TENANT_SLUG_PERSISTENCE_GAP).toContain("tenants.slug");
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
});
