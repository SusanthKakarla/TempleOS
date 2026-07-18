import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { getTenantDetailForSuperAdmin } from "@/lib/db/tenants";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

    return NextResponse.json({ temple });
  } catch {
    return NextResponse.json(
      { error: "Temple detail failed.", code: "TEMPLE_DETAIL_FAILED" },
      { status: 500 },
    );
  }
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
