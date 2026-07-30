import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getTenantById } from "@/lib/db/tenants";
import { listDevotees, listDevoteesByIds } from "@/lib/db/devotees";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { buildExportMetaLabels } from "@/lib/export/locale-labels";
import { buildDevoteeExportColumns, type DevoteeExportLabels } from "@/lib/export/columns/devotees";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { translateFields } from "@/lib/i18n/translate-rows";
import { toEnglishSearchQuery } from "@/lib/i18n/search-query";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

async function buildDevoteeColumnsAndLabels() {
  const [t, tRelationship, tGender, tMaritalStatus] = await Promise.all([
    getTranslations("exportLabels.devotees"),
    getTranslations("devotees.relationshipNames"),
    getTranslations("devotees.formDialog.genderOptions"),
    getTranslations("devotees.formDialog.maritalStatusOptions"),
  ]);
  const labels: DevoteeExportLabels = {
    headers: {
      name: t("name"),
      phone: t("phone"),
      whatsappOptIn: t("whatsappOptIn"),
      language: t("language"),
      donor: t("donor"),
      totalDonated: t("totalDonated"),
      birthStar: t("birthStar"),
      gothram: t("gothram"),
      dateOfBirth: t("dateOfBirth"),
      gender: t("gender"),
      maritalStatus: t("maritalStatus"),
      weddingAnniversary: t("weddingAnniversary"),
      registrationType: t("registrationType"),
      familyName: t("familyName"),
      relationship: t("relationship"),
      firstSeen: t("firstSeen"),
      lastSeen: t("lastSeen"),
    },
    yes: t("yes"),
    no: t("no"),
    individual: t("individual"),
    family: t("family"),
    relationshipLabels: Object.fromEntries(RELATIONSHIP_CODES.map((value) => [value, tRelationship(value)])),
    genderLabels: Object.fromEntries(GENDER_OPTIONS.map((value) => [value, tGender(value)])),
    maritalStatusLabels: Object.fromEntries(MARITAL_STATUS_OPTIONS.map((value) => [value, tMaritalStatus(value)])),
  };
  return buildDevoteeExportColumns(labels);
}

/** Export All / Export Filtered — respects the table's current `?search=`. */
export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const formatParam = formatSchema.safeParse(req.nextUrl.searchParams.get("format"));
  if (!formatParam.success) {
    return NextResponse.json({ error: "Invalid or missing format" }, { status: 400 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const locale = await getLocaleCookie();
  const rawSearch = req.nextUrl.searchParams.get("search") ?? undefined;
  const search = rawSearch ? await toEnglishSearchQuery(rawSearch) : rawSearch;
  const devoteesRaw = await listDevotees(session.tenantId, { search });
  const devotees = await translateFields(devoteesRaw, locale, ["displayName", "familyName"]);

  const generatedAt = new Date();
  const [columns, labels] = await Promise.all([
    buildDevoteeColumnsAndLabels(),
    buildExportMetaLabels(session.displayName, generatedAt),
  ]);
  const file = await buildExportFile(formatParam.data as ExportFormat, columns, devotees, {
    title: "Devotees",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
  });
  return fileResponse(file);
}

const selectedExportSchema = z.object({
  format: formatSchema,
  ids: z.array(z.string()).min(1, "Select at least one devotee"),
});

/** Export Selected — POST since a large ID list doesn't fit a GET query string reliably. */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
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

  const locale = await getLocaleCookie();
  const devoteesRaw = await listDevoteesByIds(session.tenantId, parsed.data.ids);
  const devotees = await translateFields(devoteesRaw, locale, ["displayName", "familyName"]);

  const generatedAt = new Date();
  const [columns, labels] = await Promise.all([
    buildDevoteeColumnsAndLabels(),
    buildExportMetaLabels(session.displayName, generatedAt),
  ]);
  const file = await buildExportFile(parsed.data.format, columns, devotees, {
    title: "Devotees",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
  });
  return fileResponse(file);
}
