import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getTenantDetailForSuperAdmin, type SuperAdminTenantDetail } from "@/lib/db/tenants";
import {
  parseUpdateProvisionedTempleInput,
  updateProvisionedTemple,
  UpdateProvisionedTempleError,
  type ProvisionTempleValidationIssue,
} from "@/lib/provisioning/temples";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalidJson = Symbol("invalid-json");
const stableUpdateValidationMessages = new Set([
  "Temple name is required",
  "Enter a valid phone number.",
  "Timezone is required",
  "Timezone must be a valid IANA timezone",
  "At least one safe tenant field is required.",
  "Field is not editable in this operation.",
  "Tenant update payload is required.",
  "Invalid JSON body.",
]);

interface TempleDetailRouteContext {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function GET(_req: NextRequest, context: TempleDetailRouteContext) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const { tenantId } = await context.params;
  if (!uuidPattern.test(tenantId)) {
    return templeNotFoundResponse();
  }

  try {
    const temple = await getTenantDetailForSuperAdmin(tenantId);
    if (!temple) {
      return templeNotFoundResponse();
    }

    return NextResponse.json({ temple: activeOperationTempleDetail(temple) });
  } catch {
    return NextResponse.json(
      { error: "Temple detail failed.", code: "TEMPLE_DETAIL_FAILED" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest, context: TempleDetailRouteContext) {
  const superAdmin = await requireSuperAdmin().catch(() => undefined);
  if (superAdmin === undefined) {
    return templeUpdateFailedResponse();
  }
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const { tenantId } = await context.params;
  if (!uuidPattern.test(tenantId)) {
    return templeNotFoundResponse();
  }

  const json = await req.json().catch(() => invalidJson);
  if (json === invalidJson) {
    return invalidTempleUpdateRequest([{ path: ["tenant"], message: "Invalid JSON body." }]);
  }

  const parsed = parseUpdateProvisionedTempleInput(json, tenantId);
  if (!parsed.ok) {
    return invalidTempleUpdateRequest(parsed.errors);
  }

  try {
    const temple = await updateProvisionedTemple(parsed.data, {
      type: "super_admin",
      superAdminId: superAdmin.id,
      phoneNumber: superAdmin.phoneNumber,
      displayName: superAdmin.displayName,
    });

    return NextResponse.json({ temple: activeOperationTempleDetail(temple) });
  } catch (err) {
    return templeUpdateErrorResponse(err);
  }
}

function activeOperationTempleDetail(temple: SuperAdminTenantDetail) {
  return {
    tenant: temple.tenant,
    domain: temple.domain,
    members: temple.members,
    whatsappAccount: temple.whatsappAccount,
  };
}

function templeNotFoundResponse(): NextResponse {
  return NextResponse.json(
    { error: "Temple not found.", code: "TEMPLE_NOT_FOUND" },
    { status: 404 },
  );
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

function invalidTempleUpdateRequest(errors: ProvisionTempleValidationIssue[]): NextResponse {
  return NextResponse.json(
    {
      error: "Invalid temple update request",
      code: "VALIDATION_ERROR",
      errors: errors.map(sanitizeUpdateValidationIssue),
    },
    { status: 400 },
  );
}

function templeUpdateErrorResponse(err: unknown): NextResponse {
  if (err instanceof UpdateProvisionedTempleError) {
    if (err.status === 400) {
      return invalidTempleUpdateRequest(err.errors);
    }
    if (err.status === 404) {
      return templeNotFoundResponse();
    }
  }

  return templeUpdateFailedResponse();
}

function sanitizeUpdateValidationIssue(issue: ProvisionTempleValidationIssue): ProvisionTempleValidationIssue {
  return {
    path: issue.path,
    message: stableUpdateValidationMessages.has(issue.message) ? issue.message : "Invalid field value.",
  };
}

function templeUpdateFailedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Temple update failed.", code: "TEMPLE_UPDATE_FAILED" },
    { status: 500 },
  );
}
