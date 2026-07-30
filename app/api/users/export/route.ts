import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getTenantById } from "@/lib/db/tenants";
import { listTenantMembershipsForTenant, listTenantMembershipsByIds } from "@/lib/db/tenant-memberships";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { buildExportMetaLabels } from "@/lib/export/locale-labels";
import { buildUserExportColumns, type UserExportLabels } from "@/lib/export/columns/users";
import { toEnglishSearchQuery } from "@/lib/i18n/search-query";
import { isRoleCode, ROLE_CODES, type TenantMembershipStatus } from "@/types/db";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

async function buildUserColumnsAndLabels() {
  const [t, tStatus, tRole] = await Promise.all([
    getTranslations("exportLabels.users"),
    getTranslations("userManagement.status"),
    getTranslations("userManagement.roleNames"),
  ]);
  const labels: UserExportLabels = {
    headers: {
      name: t("name"),
      phone: t("phone"),
      roles: t("roles"),
      status: t("status"),
      joined: t("joined"),
      lastLogin: t("lastLogin"),
    },
    enabled: tStatus("enabled"),
    disabled: tStatus("disabled"),
    roleLabels: Object.fromEntries(ROLE_CODES.map((value) => [value, tRole(value)])),
  };
  return buildUserExportColumns(labels);
}

/** Export All / Export Filtered — respects the table's current search/status/role filters. */
export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "user_management");
  if (featureBlocked) return featureBlocked;

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
  const rawSearch = params.get("search") ?? undefined;
  const search = rawSearch ? await toEnglishSearchQuery(rawSearch) : rawSearch;
  const members = await listTenantMembershipsForTenant(session.tenantId, {
    search,
    status: statusParam === "active" || statusParam === "inactive" ? (statusParam as TenantMembershipStatus) : undefined,
    role: roleParam && isRoleCode(roleParam) ? roleParam : undefined,
  });

  const generatedAt = new Date();
  const [columns, labels] = await Promise.all([buildUserColumnsAndLabels(), buildExportMetaLabels(session.displayName, generatedAt)]);
  const file = await buildExportFile(formatParam.data as ExportFormat, columns, members, {
    title: "Users",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
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
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "user_management");
  if (featureBlocked) return featureBlocked;

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

  const generatedAt = new Date();
  const [columns, labels] = await Promise.all([buildUserColumnsAndLabels(), buildExportMetaLabels(session.displayName, generatedAt)]);
  const file = await buildExportFile(parsed.data.format, columns, members, {
    title: "Users",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
  });
  return fileResponse(file);
}
