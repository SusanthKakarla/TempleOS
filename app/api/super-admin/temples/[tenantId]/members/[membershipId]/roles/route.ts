import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import {
  assignTenantMemberRoles,
  AssignTenantMemberRolesError,
  parseAssignTenantMemberRolesInput,
  type ProvisionTempleValidationIssue,
} from "@/lib/provisioning/temples";

const invalidJson = Symbol("invalid-json");
const stableRoleAssignmentValidationMessages = new Set([
  "Invalid JSON body.",
  "Invalid tenant ID.",
  "Invalid member ID.",
  "Roles are required.",
  "Expected array, received undefined",
]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface MemberRolesRouteContext {
  params: Promise<{
    tenantId: string;
    membershipId: string;
  }>;
}

export async function PUT(req: NextRequest, context: MemberRolesRouteContext) {
  const superAdmin = await requireSuperAdmin().catch(() => undefined);
  if (superAdmin === undefined) {
    return roleAssignmentFailedResponse();
  }
  if (!superAdmin) {
    return await superAdminAuthError();
  }

  const { tenantId, membershipId } = await context.params;
  if (!uuidPattern.test(tenantId) || !uuidPattern.test(membershipId)) {
    return memberNotFoundResponse();
  }

  const json = await req.json().catch(() => invalidJson);
  if (json === invalidJson) {
    return invalidRoleAssignmentRequest([{ path: ["roles"], message: "Invalid JSON body." }]);
  }

  const parsed = parseAssignTenantMemberRolesInput(json, tenantId, membershipId);
  if (!parsed.ok) {
    return invalidRoleAssignmentRequest(parsed.errors);
  }

  try {
    const temple = await assignTenantMemberRoles(parsed.data, {
      type: "super_admin",
      superAdminId: superAdmin.id,
      phoneNumber: superAdmin.phoneNumber,
      displayName: superAdmin.displayName,
    });

    return NextResponse.json({ temple });
  } catch (err) {
    return roleAssignmentErrorResponse(err);
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

function invalidRoleAssignmentRequest(errors: ProvisionTempleValidationIssue[]): NextResponse {
  return NextResponse.json(
    {
      error: "Invalid role assignment request",
      code: "VALIDATION_ERROR",
      errors: errors.map(sanitizeRoleAssignmentValidationIssue),
    },
    { status: 400 },
  );
}

function roleAssignmentErrorResponse(err: unknown): NextResponse {
  if (err instanceof AssignTenantMemberRolesError) {
    if (err.status === 400) {
      return invalidRoleAssignmentRequest(err.errors);
    }
    if (err.status === 404) {
      return memberNotFoundResponse();
    }
  }

  return roleAssignmentFailedResponse();
}

function memberNotFoundResponse(): NextResponse {
  return NextResponse.json(
    { error: "Member not found.", code: "MEMBER_NOT_FOUND" },
    { status: 404 },
  );
}

function roleAssignmentFailedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Role assignment failed.", code: "ROLE_ASSIGNMENT_FAILED" },
    { status: 500 },
  );
}

function sanitizeRoleAssignmentValidationIssue(
  issue: ProvisionTempleValidationIssue,
): ProvisionTempleValidationIssue {
  if (
    issue.path.join(".") === "roles" &&
    (issue.message.startsWith("Unknown role code: ") ||
      issue.message.startsWith("Inactive role code: "))
  ) {
    return issue;
  }

  return {
    path: issue.path,
    message: stableRoleAssignmentValidationMessages.has(issue.message)
      ? issue.message
      : "Invalid field value.",
  };
}
