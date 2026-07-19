import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getTenantById } from "@/lib/db/tenants";
import { listTenantMembershipsForTenant, listTenantMembershipsByIds } from "@/lib/db/tenant-memberships";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { USER_EXPORT_COLUMNS } from "@/lib/export/columns/users";
import { isRoleCode, type TenantMembershipStatus } from "@/types/db";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

/** Export All / Export Filtered — respects the table's current search/status/role filters. */
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

  const params = req.nextUrl.searchParams;
  const statusParam = params.get("status");
  const roleParam = params.get("role");
  const members = await listTenantMembershipsForTenant(session.tenantId, {
    search: params.get("search") ?? undefined,
    status: statusParam === "active" || statusParam === "inactive" ? (statusParam as TenantMembershipStatus) : undefined,
    role: roleParam && isRoleCode(roleParam) ? roleParam : undefined,
  });

  const file = await buildExportFile(formatParam.data as ExportFormat, USER_EXPORT_COLUMNS, members, {
    title: "Users",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}

const selectedExportSchema = z.object({
  format: formatSchema,
  ids: z.array(z.string()).min(1, "Select at least one user"),
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

  const members = await listTenantMembershipsByIds(session.tenantId, parsed.data.ids);

  const file = await buildExportFile(parsed.data.format, USER_EXPORT_COLUMNS, members, {
    title: "Users",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}
