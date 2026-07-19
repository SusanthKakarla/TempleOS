import { NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { listAuditLogEntriesForTenant } from "@/lib/db/audit-log";

export async function GET() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const entries = await listAuditLogEntriesForTenant(session.tenantId, { limit: 100 });
  return NextResponse.json({ entries });
}
