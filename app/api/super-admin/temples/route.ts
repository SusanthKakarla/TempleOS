import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import {
  countTenantsForSuperAdmin,
  listTenantsForSuperAdmin,
  type SuperAdminTenantSummary,
} from "@/lib/db/tenants";
import { computeTotalPages, parsePageParam, parsePageSizeParam } from "@/lib/pagination";
import {
  parseProvisionTempleInput,
  provisionTemple,
  type ProvisionTempleValidationIssue,
  ProvisionTempleError,
} from "@/lib/provisioning/temples";

const invalidJson = Symbol("invalid-json");
const stableValidationMessages = new Set([
  "Enter a valid phone number.",
  "First member roles must include admin.",
  "Tenant slug must use lowercase letters, numbers, and internal hyphens only.",
  "Tenant slug is reserved.",
  "Subdomain must use lowercase letters, numbers, and internal hyphens only.",
  "Subdomain is reserved.",
  "Subdomain cannot produce a tenant hostname.",
  "Timezone must be a valid IANA timezone",
  "Enter a valid Razorpay Key ID",
  "Razorpay Key Secret is required",
  "Business name is required",
  "Merchant name is required",
  "Enter a valid contact email",
  "Contact phone is required",
]);

export async function GET(req: NextRequest) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const params = req.nextUrl.searchParams;
  const page = parsePageParam(params.get("page") ?? undefined);
  const pageSize = parsePageSizeParam(params.get("pageSize") ?? undefined);

  try {
    const [rows, total] = await Promise.all([
      listTenantsForSuperAdmin({ page, pageSize }),
      countTenantsForSuperAdmin(),
    ]);
    const temples = rows.map(activeOperationTempleSummary);
    return NextResponse.json({
      temples,
      pagination: { page, pageSize, total, totalPages: computeTotalPages(total, pageSize) },
    });
  } catch {
    return NextResponse.json(
      { error: "Temple list failed.", code: "TEMPLE_LIST_FAILED" },
      { status: 500 },
    );
  }
}

function activeOperationTempleSummary(temple: SuperAdminTenantSummary) {
  return {
    id: temple.id,
    slug: temple.slug,
    name: temple.name,
    primaryHostname: temple.primaryHostname,
    primaryAdminName: temple.primaryAdminName,
    primaryAdminPhoneNumber: temple.primaryAdminPhoneNumber,
    activeMemberCount: temple.activeMemberCount,
    websiteHostname: temple.websiteHostname,
    websitePublished: temple.websitePublished,
    lastUpdatedAt: temple.lastUpdatedAt,
  };
}

export async function POST(req: NextRequest) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const json = await req.json().catch(() => invalidJson);
  if (json === invalidJson) {
    return invalidProvisioningRequest([]);
  }

  const parsed = parseProvisionTempleInput(json);
  if (!parsed.ok) {
    return invalidProvisioningRequest(parsed.errors);
  }

  try {
    const temple = await provisionTemple(parsed.data, {
      type: "super_admin",
      superAdminId: superAdmin.id,
      phoneNumber: superAdmin.phoneNumber,
      displayName: superAdmin.displayName,
    });

    return NextResponse.json({ temple }, { status: 201 });
  } catch (err) {
    return provisioningErrorResponse(err);
  }
}

async function superAdminAuthError(): Promise<NextResponse> {
  const store = await cookies();
  const tenantToken = store.get(TENANT_SESSION_COOKIE_NAME)?.value;
  const hasTenantSession = tenantToken ? Boolean(verifySessionToken(tenantToken)) : false;

  if (hasTenantSession) {
    return NextResponse.json(
      { error: "Super Admin access required", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  return NextResponse.json(
    { error: "Super Admin session required", code: "UNAUTHENTICATED" },
    { status: 401 },
  );
}

function invalidProvisioningRequest(errors: ProvisionTempleValidationIssue[]): NextResponse {
  return NextResponse.json(
    {
      error: "Invalid provisioning request",
      code: "VALIDATION_ERROR",
      errors: errors.map(sanitizeValidationIssue),
    },
    { status: 400 },
  );
}

function provisioningErrorResponse(err: unknown): NextResponse {
  if (err instanceof ProvisionTempleError) {
    if (err.status >= 500) {
      return stableProvisioningFailedResponse();
    }

    return NextResponse.json(
      {
        error: stableProvisioningErrorMessage(err),
        code: err.code,
        ...(err.field ? { field: err.field } : {}),
      },
      { status: err.status },
    );
  }

  return stableProvisioningFailedResponse();
}

function sanitizeValidationIssue(issue: ProvisionTempleValidationIssue): ProvisionTempleValidationIssue {
  return {
    path: issue.path,
    message: stableValidationMessages.has(issue.message) ? issue.message : "Invalid field value.",
  };
}

function stableProvisioningErrorMessage(err: ProvisionTempleError): string {
  if (err.code === "VALIDATION_ERROR") return "Invalid provisioning request";
  if (err.code === "PROVISIONING_CONFLICT") return "Temple provisioning conflicts with an existing record.";
  return "Temple provisioning failed.";
}

function stableProvisioningFailedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Temple provisioning failed.", code: "PROVISIONING_FAILED" },
    { status: 500 },
  );
}
