import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { listRoleDefinitionsForSuperAdmin } from "@/lib/db/role-definitions";

export async function GET() {
  try {
    const superAdmin = await requireSuperAdmin();
    if (!superAdmin) {
      return await superAdminAuthError();
    }

    const roles = await listRoleDefinitionsForSuperAdmin();
    return NextResponse.json({ roles });
  } catch {
    return roleCatalogFailedResponse();
  }
}

export async function POST() {
  return rejectCustomRoleMutation();
}

export const PUT = rejectCustomRoleMutation;
export const PATCH = rejectCustomRoleMutation;
export const DELETE = rejectCustomRoleMutation;

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

async function rejectCustomRoleMutation(): Promise<NextResponse> {
  try {
    const superAdmin = await requireSuperAdmin();
    if (!superAdmin) {
      return await superAdminAuthError();
    }

    return NextResponse.json(
      { error: "Custom tenant-local roles are deferred.", code: "CUSTOM_ROLES_DEFERRED" },
      { status: 405, headers: { Allow: "GET" } },
    );
  } catch {
    return roleCatalogFailedResponse();
  }
}

function roleCatalogFailedResponse(): NextResponse {
  return NextResponse.json(
    { error: "Role catalog failed.", code: "ROLE_CATALOG_FAILED" },
    { status: 500 },
  );
}
