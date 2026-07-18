import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function GET() {
  const superAdmin = await requireSuperAdmin();
  if (superAdmin) {
    return NextResponse.json({
      superAdmin: {
        id: superAdmin.id,
        phoneNumber: superAdmin.phoneNumber,
        displayName: superAdmin.displayName,
      },
    });
  }

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
