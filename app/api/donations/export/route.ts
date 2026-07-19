import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getTenantById } from "@/lib/db/tenants";
import { listDonations, listDonationsByIds } from "@/lib/db/donations";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { DONATION_EXPORT_COLUMNS } from "@/lib/export/columns/donations";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

/** Export All / Export Filtered — respects the table's current `?search=&dateFrom=&dateTo=`. */
export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const formatParam = formatSchema.safeParse(req.nextUrl.searchParams.get("format"));
  if (!formatParam.success) {
    return NextResponse.json({ error: "Invalid or missing format" }, { status: 400 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const donations = await listDonations(session.tenantId, {
    search: req.nextUrl.searchParams.get("search") ?? undefined,
    dateFrom: req.nextUrl.searchParams.get("dateFrom") ?? undefined,
    dateTo: req.nextUrl.searchParams.get("dateTo") ?? undefined,
  });

  const file = await buildExportFile(formatParam.data as ExportFormat, DONATION_EXPORT_COLUMNS, donations, {
    title: "Donations",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}

const selectedExportSchema = z.object({
  format: formatSchema,
  ids: z.array(z.string()).min(1, "Select at least one donation"),
});

/** Export Selected — POST since a large ID list doesn't fit a GET query string reliably. */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = selectedExportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const donations = await listDonationsByIds(session.tenantId, parsed.data.ids);

  const file = await buildExportFile(parsed.data.format, DONATION_EXPORT_COLUMNS, donations, {
    title: "Donations",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}
