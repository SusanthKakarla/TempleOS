import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getTenantById } from "@/lib/db/tenants";
import { listCampaigns, listCampaignsByIds } from "@/lib/db/campaigns";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { CAMPAIGN_EXPORT_COLUMNS } from "@/lib/export/columns/campaigns";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

/** Export All / Export Filtered — respects the table's current `?status=`/`?search=`. */
export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const formatParam = formatSchema.safeParse(req.nextUrl.searchParams.get("format"));
  if (!formatParam.success) {
    return NextResponse.json({ error: "Invalid or missing format" }, { status: 400 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const campaigns = await listCampaigns(session.tenantId, {
    search: req.nextUrl.searchParams.get("search") ?? undefined,
  });

  const file = await buildExportFile(formatParam.data as ExportFormat, CAMPAIGN_EXPORT_COLUMNS, campaigns, {
    title: "Campaigns",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}

const selectedExportSchema = z.object({
  format: formatSchema,
  ids: z.array(z.string()).min(1, "Select at least one campaign"),
});

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "campaigns");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = selectedExportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) return NextResponse.json({ error: "Tenant not found" }, { status: 404 });

  const campaigns = await listCampaignsByIds(session.tenantId, parsed.data.ids);

  const file = await buildExportFile(parsed.data.format, CAMPAIGN_EXPORT_COLUMNS, campaigns, {
    title: "Campaigns",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}
