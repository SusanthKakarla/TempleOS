import type { RoleCode, Tenant, TenantDomain, WhatsAppAccount } from "@/types/db";
import type { TenantMembershipWithRoles } from "@/lib/db/tenant-memberships";

export const PRODUCT_DOMAIN = "trytempleos.com";
export const RESERVED_SUBDOMAINS = [
  "www",
  "admin",
  "super-admin",
  "api",
  "localhost",
  "trytempleos",
  "trytempleos-com",
] as const;
export const ROLE_OPTIONS = [
  { code: "admin", label: "Admin" },
  { code: "priest", label: "Priest" },
  { code: "committee_member", label: "Committee member" },
  { code: "volunteer", label: "Volunteer" },
  { code: "devotee", label: "Devotee" },
] as const satisfies Array<{ code: RoleCode; label: string }>;

export interface NewTempleFormState {
  templeName: string;
  tenantSlug: string;
  subdomain: string;
  contactPhone: string;
  address: string;
  timezone: string;
  firstMemberPhone: string;
  firstMemberDisplayName: string;
  firstMemberRoles: RoleCode[];
  whatsappPhoneNumber: string;
  metaPhoneNumberId: string;
  metaBusinessAccountId: string;
}

export interface ProvisionTemplePayload {
  tenant: {
    name: string;
    slug: string;
    defaultContactPhone: string | null;
    address: string | null;
    timezone: string;
  };
  domain: {
    subdomain: string;
  };
  firstMember: {
    phoneNumber: string;
    displayName: string;
    roles: RoleCode[];
  };
  whatsappAccount?: {
    phoneNumber: string;
    metaPhoneNumberId: string;
    metaBusinessAccountId: string;
  };
}

export interface ProvisionTempleSuccess {
  temple: {
    tenant: Tenant;
    domain: TenantDomain;
    firstMember: TenantMembershipWithRoles;
    roles: RoleCode[];
    whatsappAccount: WhatsAppAccount | null;
  };
}

export interface NewTempleFormErrors {
  fieldErrors: Record<string, string>;
  sectionErrors: Record<string, string>;
}

const renderedFieldKeys = new Set([
  "templeName",
  "tenantSlug",
  "contactPhone",
  "address",
  "timezone",
  "subdomain",
  "firstMemberPhone",
  "firstMemberDisplayName",
  "firstMemberRoles",
  "whatsappPhoneNumber",
  "metaPhoneNumberId",
  "metaBusinessAccountId",
]);

export type BuildProvisionTemplePayloadResult =
  | { ok: true; payload: ProvisionTemplePayload }
  | ({ ok: false } & NewTempleFormErrors);

export const DEFAULT_NEW_TEMPLE_FORM_STATE: NewTempleFormState = {
  templeName: "",
  tenantSlug: "",
  subdomain: "",
  contactPhone: "",
  address: "",
  timezone: "America/Los_Angeles",
  firstMemberPhone: "",
  firstMemberDisplayName: "",
  firstMemberRoles: ["admin"],
  whatsappPhoneNumber: "",
  metaPhoneNumberId: "",
  metaBusinessAccountId: "",
};

export function normalizeSubdomainInput(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fullHostnamePreview(value: string): string {
  const subdomain = normalizeSubdomainInput(value);
  return subdomain ? `${subdomain}.${PRODUCT_DOMAIN}` : "";
}

export function validateNewTempleForm(state: NewTempleFormState): BuildProvisionTemplePayloadResult {
  const fieldErrors: Record<string, string> = {};
  const sectionErrors: Record<string, string> = {};
  const tenantSlug = normalizeSubdomainInput(state.tenantSlug);
  const subdomain = normalizeSubdomainInput(state.subdomain);

  if (!state.templeName.trim()) fieldErrors.templeName = "Temple name is required.";
  if (!tenantSlug) {
    fieldErrors.tenantSlug = "Tenant slug is required.";
  } else if (isReservedSubdomain(tenantSlug)) {
    fieldErrors.tenantSlug = "This tenant slug is reserved.";
  }
  if (!subdomain) {
    fieldErrors.subdomain = "Subdomain is required.";
  } else if (isReservedSubdomain(subdomain)) {
    fieldErrors.subdomain = "This subdomain is reserved.";
  }
  if (!state.timezone.trim()) fieldErrors.timezone = "Timezone is required.";
  if (!state.firstMemberPhone.trim()) fieldErrors.firstMemberPhone = "First member phone is required.";
  if (!state.firstMemberDisplayName.trim()) {
    fieldErrors.firstMemberDisplayName = "First member display name is required.";
  }

  const whatsappValues = [
    state.whatsappPhoneNumber.trim(),
    state.metaPhoneNumberId.trim(),
    state.metaBusinessAccountId.trim(),
  ];
  const hasAnyWhatsAppValue = whatsappValues.some(Boolean);
  const hasAllWhatsAppValues = whatsappValues.every(Boolean);
  if (hasAnyWhatsAppValue && !hasAllWhatsAppValues) {
    sectionErrors.whatsappAccount =
      "Provide WhatsApp phone, Meta phone number ID, and Meta business account ID together.";
  }

  if (Object.keys(fieldErrors).length > 0 || Object.keys(sectionErrors).length > 0) {
    return { ok: false, fieldErrors, sectionErrors };
  }

  return {
    ok: true,
    payload: {
      tenant: {
        name: state.templeName.trim(),
        slug: tenantSlug,
        defaultContactPhone: nullableTrim(state.contactPhone),
        address: nullableTrim(state.address),
        timezone: state.timezone.trim(),
      },
      domain: {
        subdomain,
      },
      firstMember: {
        phoneNumber: state.firstMemberPhone.trim(),
        displayName: state.firstMemberDisplayName.trim(),
        roles: normalizedRoles(state.firstMemberRoles),
      },
      ...(hasAllWhatsAppValues
        ? {
            whatsappAccount: {
              phoneNumber: state.whatsappPhoneNumber.trim(),
              metaPhoneNumberId: state.metaPhoneNumberId.trim(),
              metaBusinessAccountId: state.metaBusinessAccountId.trim(),
            },
          }
        : {}),
    },
  };
}

export function buildProvisionTemplePayload(state: NewTempleFormState): BuildProvisionTemplePayloadResult {
  return validateNewTempleForm(state);
}

export function formErrorsFromApiError(body: unknown): NewTempleFormErrors {
  const fieldErrors: Record<string, string> = {};
  const sectionErrors: Record<string, string> = {};

  if (!isRecord(body)) {
    return { fieldErrors, sectionErrors: { form: "Temple provisioning failed." } };
  }

  if (body.code === "VALIDATION_ERROR" && Array.isArray(body.errors)) {
    for (const issue of body.errors) {
      if (!isRecord(issue) || !Array.isArray(issue.path) || typeof issue.message !== "string") continue;
      const field = fieldKeyFromPath(issue.path.map(String));
      if (field && renderedFieldKeys.has(field)) {
        fieldErrors[field] = issue.message;
      } else {
        sectionErrors.form = issue.message;
      }
    }
    if (Object.keys(fieldErrors).length === 0 && !sectionErrors.form) {
      sectionErrors.form = "Invalid provisioning request.";
    }
  } else if (body.code === "PROVISIONING_CONFLICT") {
    const field = typeof body.field === "string" ? fieldKeyFromPath(body.field.split(".")) : null;
    const message = typeof body.error === "string" ? body.error : "Temple provisioning conflicts with an existing record.";
    if (field && renderedFieldKeys.has(field)) {
      fieldErrors[field] = message;
    } else {
      sectionErrors.form = message;
    }
  } else if (body.code === "UNAUTHENTICATED") {
    sectionErrors.form = "Super Admin session required.";
  } else if (body.code === "FORBIDDEN") {
    sectionErrors.form = "Super Admin access required.";
  } else {
    sectionErrors.form = "Temple provisioning failed.";
  }

  return { fieldErrors, sectionErrors };
}

export function fieldKeyFromPath(path: string[]): string | null {
  const joined = path.join(".");
  switch (joined) {
    case "tenant.name":
      return "templeName";
    case "tenant.slug":
      return "tenantSlug";
    case "tenant.defaultContactPhone":
      return "contactPhone";
    case "tenant.address":
      return "address";
    case "tenant.timezone":
      return "timezone";
    case "domain.subdomain":
    case "domain.hostname":
      return "subdomain";
    case "firstMember.phoneNumber":
      return "firstMemberPhone";
    case "firstMember.displayName":
      return "firstMemberDisplayName";
    case "firstMember.roles":
      return "firstMemberRoles";
    case "whatsappAccount.phoneNumber":
      return "whatsappPhoneNumber";
    case "whatsappAccount.metaPhoneNumberId":
      return "metaPhoneNumberId";
    case "whatsappAccount.metaBusinessAccountId":
      return "metaBusinessAccountId";
    default:
      return null;
  }
}

function isReservedSubdomain(value: string): boolean {
  return RESERVED_SUBDOMAINS.includes(value as (typeof RESERVED_SUBDOMAINS)[number]);
}

function normalizedRoles(roles: RoleCode[]): RoleCode[] {
  const next: RoleCode[] = ["admin"];
  for (const role of roles) {
    if (!next.includes(role)) next.push(role);
  }
  return next;
}

function nullableTrim(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
