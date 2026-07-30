import { NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getTenantById } from "@/lib/db/tenants";
import { buildExportFile } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { DONATION_IMPORT_TEMPLATE_COLUMNS, DONATION_IMPORT_TEMPLATE_EXAMPLE_ROWS } from "@/lib/export/columns/donations";

export async function GET() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const file = await buildExportFile("xlsx", DONATION_IMPORT_TEMPLATE_COLUMNS, DONATION_IMPORT_TEMPLATE_EXAMPLE_ROWS, {
    title: "Donation Import Template",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}
