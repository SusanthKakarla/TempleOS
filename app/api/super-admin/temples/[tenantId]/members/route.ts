import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import {
  addTenantMemberAsSuperAdmin,
  AddTenantMemberError,
  parseAddTenantMemberInput,
  type ProvisionTempleValidationIssue,
} from "@/lib/provisioning/temples";

const invalidJson = Symbol("invalid-json");
const stableAddMemberValidationMessages = new Set([
  "Invalid JSON body.",
  "Invalid tenant ID.",
  "Member name is required.",
  "Member phone number is required.",
  "Enter a valid phone number.",
  "Enter a valid email address.",
  "Roles are required.",
  "At least one role is required.",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface MembersRouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function POST(req: NextRequest, context: MembersRouteContext) {
  const superAdmin = await requireSuperAdmin().catch(() => undefined);
  if (superAdmin === undefined) {
    return addMemberFailedResponse();
  }
  if (!superAdmin) {
    return await superAdminAuthError();
  }

  const { tenantId } = await context.params;
  if (!uuidPattern.test(tenantId)) {
    return templeNotFoundResponse();
  }

  const json = await req.json().catch(() => invalidJson);
  if (json === invalidJson) {
    return invalidAddMemberRequest([{ path: ["displayName"], message: "Invalid JSON body." }]);
  }

  const parsed = parseAddTenantMemberInput(json, tenantId);
  if (!parsed.ok) {
    return invalidAddMemberRequest(parsed.errors);
  }

  try {
    const { temple, membershipId } = await addTenantMemberAsSuperAdmin(parsed.data, {
      type: "super_admin",
      superAdminId: superAdmin.id,
      phoneNumber: superAdmin.phoneNumber,
      displayName: superAdmin.displayName,
    });

    return NextResponse.json({ temple, membershipId }, { status: 201 });
  } catch (err) {
    return addMemberErrorResponse(err);
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

function invalidAddMemberRequest(errors: ProvisionTempleValidationIssue[]): NextResponse {
  return NextResponse.json(
    {
      error: "Invalid add member request",
      code: "VALIDATION_ERROR",
      errors: errors.map(sanitizeAddMemberValidationIssue),
    },
    { status: 400 },
  );
}

function addMemberErrorResponse(err: unknown): NextResponse {
  if (err instanceof AddTenantMemberError) {
    if (err.status === 400) {
      return invalidAddMemberRequest(err.errors);
    }
    if (err.status === 404) {
      return templeNotFoundResponse();
    }
    if (err.status === 409) {
      return NextResponse.json(
        { error: "This person is already a member of this temple.", code: "ALREADY_MEMBER" },
        { status: 409 },
      );
    }
  }

  return addMemberFailedResponse();
}

function templeNotFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Temple not found.", code: "TEMPLE_NOT_FOUND" }, { status: 404 });
}

function addMemberFailedResponse(): NextResponse {
  return NextResponse.json({ error: "Failed to add member.", code: "ADD_MEMBER_FAILED" }, { status: 500 });
}

function sanitizeAddMemberValidationIssue(
  issue: ProvisionTempleValidationIssue,
): ProvisionTempleValidationIssue {
  if (
    issue.path.join(".") === "roles" &&
    (issue.message.startsWith("Unknown role code: ") || issue.message.startsWith("Inactive role code: "))
  ) {
    return issue;
  }

  return {
    path: issue.path,
    message: stableAddMemberValidationMessages.has(issue.message) ? issue.message : "Invalid field value.",
  };
}
