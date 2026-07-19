import { NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { listAuditLogEntriesForTenant } from "@/lib/db/audit-log";

interface RouteParams {
  params: Promise<{ membershipId: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { membershipId } = await params;
  const entries = await listAuditLogEntriesForTenant(session.tenantId, {
    targetId: membershipId,
    targetType: "tenant_membership",
  });
  return NextResponse.json({ entries });
}
