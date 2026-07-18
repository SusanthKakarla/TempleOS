import { NextResponse } from "next/server";
import { getSessionAdmin, type SessionPayload } from "./session";

export type TenantAdminAuthResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; status: 401; code: "UNAUTHORIZED" }
  | { ok: false; status: 403; code: "TENANT_ADMIN_REQUIRED" };

export async function requireTenantAdminSession(): Promise<TenantAdminAuthResult> {
  const session = await getSessionAdmin();
  if (!session) {
    return { ok: false, status: 401, code: "UNAUTHORIZED" };
  }

  if (!session.roles.includes("admin")) {
    return { ok: false, status: 403, code: "TENANT_ADMIN_REQUIRED" };
  }

  return { ok: true, session };
}

export function tenantAdminAuthResponse(
  result: Exclude<TenantAdminAuthResult, { ok: true }>,
): NextResponse {
  if (result.status === 401) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        code: result.code,
      },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      error: "Tenant admin access is required.",
      code: result.code,
    },
    { status: result.status },
  );
}
