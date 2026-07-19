import { NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { getTenantById } from "@/lib/db/tenants";
import { buildExportFile } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { DEVOTEE_IMPORT_TEMPLATE_COLUMNS } from "@/lib/export/columns/devotees";

export async function GET() {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const file = await buildExportFile("xlsx", DEVOTEE_IMPORT_TEMPLATE_COLUMNS, [], {
    title: "Devotee Import Template",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}
