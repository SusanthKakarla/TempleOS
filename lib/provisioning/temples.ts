import { z } from "zod";
import { createAuditLogEntry } from "@/lib/db/audit-log";
import { getPool } from "@/lib/db/pool";
import { V0_ROLE_DEFINITIONS } from "@/lib/db/role-definitions";
import { createTenantDomainForSuperAdmin } from "@/lib/db/tenant-domains";
import {
  assignTenantMembershipRolesForProvisioning,
  createTenantMembershipForProvisioning,
} from "@/lib/db/tenant-memberships";
import { createTenantForSuperAdmin } from "@/lib/db/tenants";
import { findOrCreatePersonByPhoneForProvisioning } from "@/lib/db/persons";
import { linkWhatsAppAccountForProvisioning } from "@/lib/db/whatsapp-accounts";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import { isGenericTenantHostname, normalizeTenantHostname } from "@/lib/tenant-domains";
import { isRoleCode, type RoleCode, type Tenant, type TenantDomain, type WhatsAppAccount } from "@/types/db";
import type { TenantMembershipWithRoles } from "@/lib/db/tenant-memberships";

export const PRODUCT_DOMAIN = "trytempleos.com";
export const RESERVED_TENANT_SUBDOMAINS = [
  "www",
  "admin",
  "super-admin",
  "api",
  "localhost",
  "trytempleos",
  "trytempleos.com",
] as const;

const RESERVED_TENANT_SUBDOMAIN_SET = new Set<string>(RESERVED_TENANT_SUBDOMAINS);
const ACTIVE_V0_ROLE_CODES = new Set<RoleCode>(
  V0_ROLE_DEFINITIONS.filter((role) => role.active).map((role) => role.code),
);

export interface ProvisionTempleActor {
  type: "super_admin";
  superAdminId: string;
  phoneNumber: string;
  displayName: string;
}

export interface LinkWhatsAppAccountInput {
  phoneNumber: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
}

export interface ProvisionTempleInput {
  tenant: {
    name: string;
    slug: string;
    defaultContactPhone?: string | null;
    address?: string | null;
    timezone: string;
  };
  domain: {
    subdomain: string;
    hostname: string;
  };
  firstMember: {
    phoneNumber: string;
    displayName: string;
    roles: RoleCode[];
  };
  whatsappAccount?: LinkWhatsAppAccountInput;
}

export interface ProvisionTempleResult {
  tenant: Tenant;
  domain: TenantDomain;
  firstMember: TenantMembershipWithRoles;
  roles: RoleCode[];
  whatsappAccount: WhatsAppAccount | null;
}

export interface ProvisionTempleValidationIssue {
  path: string[];
  message: string;
}

export type ProvisionTempleValidationResult =
  | { ok: true; data: ProvisionTempleInput }
  | {
      ok: false;
      status: 400;
      code: "VALIDATION_ERROR";
      errors: ProvisionTempleValidationIssue[];
    };

export class ProvisionTempleError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 409 | 500,
    public readonly code: "VALIDATION_ERROR" | "PROVISIONING_CONFLICT" | "PROVISIONING_FAILED",
    public readonly field?: string,
  ) {
    super(message);
    this.name = "ProvisionTempleError";
  }
}

const rawProvisionTempleSchema = z.object({
  tenant: z.object({
    name: z.string().trim().min(1, "Temple name is required").max(200),
    slug: z.string().trim().min(1, "Tenant slug is required"),
    defaultContactPhone: z.string().nullable().optional(),
    address: z
      .string()
      .transform((value) => nullableTrim(value))
      .nullable()
      .optional(),
    timezone: z
      .string()
      .trim()
      .min(1, "Timezone is required")
      .refine(isValidIanaTimeZone, "Timezone must be a valid IANA timezone"),
  }),
  domain: z.object({
    subdomain: z.string().trim().min(1, "Subdomain is required"),
  }),
  firstMember: z.object({
    phoneNumber: z.string().trim().min(1, "First member phone number is required"),
    displayName: z.string().trim().min(1, "First member display name is required"),
    roles: z.array(z.string()).min(1, "At least one first member role is required"),
  }),
  whatsappAccount: z
    .object({
      phoneNumber: z.string().trim().min(1, "WhatsApp phone number is required"),
      metaPhoneNumberId: z.string().trim().min(1, "Meta phone number ID is required"),
      metaBusinessAccountId: z.string().trim().min(1, "Meta business account ID is required"),
    })
    .nullish(),
});

export function parseProvisionTempleInput(raw: unknown): ProvisionTempleValidationResult {
  const parsed = rawProvisionTempleSchema.safeParse(raw);
  if (!parsed.success) {
    return validationError(
      parsed.error.issues.map((issue) => ({
        path: issue.path.map(String),
        message: issue.message,
      })),
    );
  }

  const issues: ProvisionTempleValidationIssue[] = [];
  const tenantSlug = normalizeSubdomain(parsed.data.tenant.slug);
  const subdomain = normalizeSubdomain(parsed.data.domain.subdomain);

  if (!tenantSlug) {
    issues.push({
      path: ["tenant", "slug"],
      message: "Tenant slug must use lowercase letters, numbers, and internal hyphens only.",
    });
  } else if (isReservedTenantSubdomain(tenantSlug)) {
    issues.push({ path: ["tenant", "slug"], message: "Tenant slug is reserved." });
  }

  if (!subdomain) {
    issues.push({
      path: ["domain", "subdomain"],
      message: "Subdomain must use lowercase letters, numbers, and internal hyphens only.",
    });
  } else if (isReservedTenantSubdomain(subdomain)) {
    issues.push({ path: ["domain", "subdomain"], message: "Subdomain is reserved." });
  }

  const hostname = subdomain ? normalizeTenantHostname(`${subdomain}.${PRODUCT_DOMAIN}`) : null;
  if (!hostname || isGenericTenantHostname(hostname)) {
    issues.push({ path: ["domain", "subdomain"], message: "Subdomain cannot produce a tenant hostname." });
  }

  const hasDefaultContactPhone = parsed.data.tenant.defaultContactPhone !== undefined;
  const defaultContactPhone = hasDefaultContactPhone
    ? normalizeNullablePhone(parsed.data.tenant.defaultContactPhone, ["tenant", "defaultContactPhone"], issues)
    : undefined;
  const firstMemberPhone = normalizeRequiredPhone(
    parsed.data.firstMember.phoneNumber,
    ["firstMember", "phoneNumber"],
    issues,
  );
  const whatsappPhone = parsed.data.whatsappAccount
    ? normalizeRequiredPhone(
        parsed.data.whatsappAccount.phoneNumber,
        ["whatsappAccount", "phoneNumber"],
        issues,
      )
    : null;

  const roles = normalizeRoleCodes(parsed.data.firstMember.roles, issues);

  if (issues.length > 0 || !tenantSlug || !subdomain || !hostname || !firstMemberPhone) {
    return validationError(issues);
  }

  return {
    ok: true,
    data: {
      tenant: {
        name: parsed.data.tenant.name,
        slug: tenantSlug,
        ...(hasDefaultContactPhone ? { defaultContactPhone } : {}),
        ...(parsed.data.tenant.address !== undefined ? { address: parsed.data.tenant.address } : {}),
        timezone: parsed.data.tenant.timezone,
      },
      domain: {
        subdomain,
        hostname,
      },
      firstMember: {
        phoneNumber: firstMemberPhone,
        displayName: parsed.data.firstMember.displayName,
        roles,
      },
      ...(parsed.data.whatsappAccount && whatsappPhone
        ? {
            whatsappAccount: {
              phoneNumber: whatsappPhone,
              metaPhoneNumberId: parsed.data.whatsappAccount.metaPhoneNumberId,
              metaBusinessAccountId: parsed.data.whatsappAccount.metaBusinessAccountId,
            },
          }
        : {}),
    },
  };
}

export async function provisionTemple(
  input: ProvisionTempleInput,
  actor: ProvisionTempleActor,
): Promise<ProvisionTempleResult> {
  const parsed = parseProvisionTempleInput(input);
  if (!parsed.ok) {
    throw new ProvisionTempleError("Temple provisioning input is invalid.", 400, "VALIDATION_ERROR");
  }
  const canonicalInput = parsed.data;

  if (actor.type !== "super_admin" || !actor.superAdminId) {
    throw new ProvisionTempleError("Super admin actor is required for temple provisioning.", 500, "PROVISIONING_FAILED");
  }

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const tenant = await createTenantForSuperAdmin(canonicalInput.tenant, client);
    const domain = await createTenantDomainForSuperAdmin(
      { tenantId: tenant.id, hostname: canonicalInput.domain.hostname },
      client,
    );
    const person = await findOrCreatePersonByPhoneForProvisioning(
      {
        phoneNumber: canonicalInput.firstMember.phoneNumber,
        displayName: canonicalInput.firstMember.displayName,
      },
      client,
    );
    const membership = await createTenantMembershipForProvisioning(
      {
        tenantId: tenant.id,
        personId: person.id,
        displayName: canonicalInput.firstMember.displayName,
      },
      client,
    );
    const firstMember = await assignTenantMembershipRolesForProvisioning(
      { membershipId: membership.id, roles: canonicalInput.firstMember.roles },
      client,
    );
    const whatsappAccount = canonicalInput.whatsappAccount
      ? await linkWhatsAppAccountForProvisioning(
          { tenantId: tenant.id, ...canonicalInput.whatsappAccount },
          client,
        )
      : null;

    await createAuditLogEntry(
      {
        actorType: "super_admin",
        actorId: actor.superAdminId,
        tenantId: tenant.id,
        action: "temple.provisioned",
        targetType: "tenant",
        targetId: tenant.id,
        metadata: {
          domainId: domain.id,
          hostname: domain.hostname,
          firstMembershipId: firstMember.id,
          firstPersonId: person.id,
          roles: canonicalInput.firstMember.roles,
          whatsappAccountId: whatsappAccount?.id ?? null,
        },
      },
      client,
    );

    await client.query("COMMIT");
    return {
      tenant,
      domain,
      firstMember,
      roles: canonicalInput.firstMember.roles,
      whatsappAccount,
    };
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // Preserve the original stable provisioning error for callers.
    }
    throw toProvisionTempleError(err);
  } finally {
    client.release();
  }
}

function normalizeSubdomain(value: string): string | null {
  const normalized = value.trim();
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) return null;
  return normalized;
}

export function isReservedTenantSubdomain(value: string): boolean {
  return RESERVED_TENANT_SUBDOMAIN_SET.has(value);
}

function isValidIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function normalizeNullablePhone(
  value: string | null | undefined,
  path: string[],
  issues: ProvisionTempleValidationIssue[],
): string | null {
  const trimmed = nullableTrim(value);
  if (trimmed === null) return null;

  const phoneNumber = normalizePhoneNumber(trimmed);
  if (!phoneNumber) {
    issues.push({ path, message: "Enter a valid phone number." });
    return null;
  }
  return phoneNumber;
}

function normalizeRequiredPhone(
  value: string,
  path: string[],
  issues: ProvisionTempleValidationIssue[],
): string | null {
  const phoneNumber = normalizePhoneNumber(value);
  if (!phoneNumber) {
    issues.push({ path, message: "Enter a valid phone number." });
    return null;
  }
  return phoneNumber;
}

function normalizeRoleCodes(
  rawRoles: string[],
  issues: ProvisionTempleValidationIssue[],
): RoleCode[] {
  const roles: RoleCode[] = [];
  for (const role of rawRoles) {
    if (!isRoleCode(role)) {
      issues.push({ path: ["firstMember", "roles"], message: `Unknown role code: ${role}` });
      continue;
    }
    if (!ACTIVE_V0_ROLE_CODES.has(role)) {
      issues.push({ path: ["firstMember", "roles"], message: `Inactive role code: ${role}` });
      continue;
    }
    if (!roles.includes(role)) roles.push(role);
  }

  if (!roles.includes("admin")) {
    issues.push({ path: ["firstMember", "roles"], message: "First member roles must include admin." });
  }

  return roles;
}

function nullableTrim(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validationError(
  errors: ProvisionTempleValidationIssue[],
): Extract<ProvisionTempleValidationResult, { ok: false }> {
  return {
    ok: false,
    status: 400,
    code: "VALIDATION_ERROR",
    errors,
  };
}

function toProvisionTempleError(err: unknown): ProvisionTempleError {
  if (err instanceof ProvisionTempleError) return err;
  if (isUniqueViolation(err)) {
    const field = conflictFieldFromConstraint(getConstraintName(err));
    return new ProvisionTempleError("Temple provisioning conflicts with an existing record.", 409, "PROVISIONING_CONFLICT", field);
  }
  return new ProvisionTempleError("Temple provisioning failed.", 500, "PROVISIONING_FAILED");
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

function getConstraintName(err: unknown): string | undefined {
  if (typeof err !== "object" || err === null || !("constraint" in err)) return undefined;
  return typeof err.constraint === "string" ? err.constraint : undefined;
}

function conflictFieldFromConstraint(constraint: string | undefined): string | undefined {
  switch (constraint) {
    case "tenants_slug_unique":
    case "tenants_slug_key":
      return "tenant.slug";
    case "tenant_domains_hostname_key":
      return "domain.hostname";
    case "tenant_memberships_tenant_id_person_id_key":
      return "firstMember.phoneNumber";
    case "whatsapp_accounts_tenant_id_unique":
      return "whatsappAccount.tenantId";
    case "whatsapp_accounts_meta_phone_number_id_key":
      return "whatsappAccount.metaPhoneNumberId";
    default:
      return undefined;
  }
}
