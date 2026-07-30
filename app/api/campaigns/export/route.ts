import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getTenantById } from "@/lib/db/tenants";
import { listCampaigns, listCampaignsByIds } from "@/lib/db/campaigns";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { buildExportMetaLabels } from "@/lib/export/locale-labels";
import { buildCampaignExportColumns, type CampaignExportLabels } from "@/lib/export/columns/campaigns";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { translateFields } from "@/lib/i18n/translate-rows";
import { toEnglishSearchQuery } from "@/lib/i18n/search-query";
import { CAMPAIGN_STATUSES, CAMPAIGN_TYPES, type CampaignScheduleType } from "@/types/db";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);
const SCHEDULE_TYPE_VALUES: CampaignScheduleType[] = ["one_time", "recurring"];

async function buildCampaignColumnsAndLabels() {
  const [t, tStatus, tType] = await Promise.all([
    getTranslations("exportLabels.campaigns"),
    getTranslations("campaigns.status"),
    getTranslations("campaigns.types"),
  ]);
  const labels: CampaignExportLabels = {
    headers: {
      title: t("title"),
      type: t("type"),
      status: t("status"),
      schedule: t("schedule"),
      nextRun: t("nextRun"),
      lastSent: t("lastSent"),
      created: t("created"),
    },
    typeLabels: Object.fromEntries(CAMPAIGN_TYPES.map((value) => [value, tType(value)])),
    statusLabels: Object.fromEntries(CAMPAIGN_STATUSES.map((value) => [value, tStatus(value)])),
    scheduleLabels: Object.fromEntries(SCHEDULE_TYPE_VALUES.map((value) => [value, tType(value)])),
  };
  return buildCampaignExportColumns(labels);
}

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

  const locale = await getLocaleCookie();
  const rawSearch = req.nextUrl.searchParams.get("search") ?? undefined;
  const search = rawSearch ? await toEnglishSearchQuery(rawSearch) : rawSearch;

  const campaignsRaw = await listCampaigns(session.tenantId, { search });
  const campaigns = await translateFields(campaignsRaw, locale, ["title", "description"]);

  const generatedAt = new Date();
  const [columns, labels] = await Promise.all([
    buildCampaignColumnsAndLabels(),
    buildExportMetaLabels(session.displayName, generatedAt),
  ]);
  const file = await buildExportFile(formatParam.data as ExportFormat, columns, campaigns, {
    title: "Campaigns",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
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

  const locale = await getLocaleCookie();
  const campaignsRaw = await listCampaignsByIds(session.tenantId, parsed.data.ids);
  const campaigns = await translateFields(campaignsRaw, locale, ["title", "description"]);

  const generatedAt = new Date();
  const [columns, labels] = await Promise.all([
    buildCampaignColumnsAndLabels(),
    buildExportMetaLabels(session.displayName, generatedAt),
  ]);
  const file = await buildExportFile(parsed.data.format, columns, campaigns, {
    title: "Campaigns",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
  });
  return fileResponse(file);
}
