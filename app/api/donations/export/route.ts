import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getTenantById } from "@/lib/db/tenants";
import { listDonationsForExport, listDonationsByIdsForExport } from "@/lib/db/donations";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { buildExportMetaLabels } from "@/lib/export/locale-labels";
import { buildDonationExportColumns, type DonationExportLabels } from "@/lib/export/columns/donations";
import { filterSelectedColumns } from "@/lib/export/select-columns";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { toEnglishSearchQuery } from "@/lib/i18n/search-query";
import { translateFields } from "@/lib/i18n/translate-rows";
import { resolveDonationPurposes } from "@/lib/donations/resolve-purpose";
import { PAYMENT_METHOD_OPTIONS } from "@/features/donations/donation-options";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

async function buildDonationColumnsAndLabels() {
  const [t, tMethod] = await Promise.all([
    getTranslations("exportLabels.donations"),
    getTranslations("donations.paymentMethods"),
  ]);
  const labels: DonationExportLabels = {
    headers: {
      donor: t("donor"),
      phone: t("phone"),
      amount: t("amount"),
      purpose: t("purpose"),
      method: t("method"),
      date: t("date"),
      notes: t("notes"),
      transactionId: t("transactionId"),
      paymentStatus: t("paymentStatus"),
      campaign: t("campaign"),
      receiptNumber: t("receiptNumber"),
      email: t("email"),
      createdDate: t("createdDate"),
      updatedDate: t("updatedDate"),
    },
    paymentMethodLabels: Object.fromEntries(
      [...PAYMENT_METHOD_OPTIONS.map(({ value }) => value), "razorpay"].map((value) => [value, tMethod(value)]),
    ),
  };
  return buildDonationExportColumns(labels);
}

/** Export All / Export Filtered — respects the table's current `?search=&dateFrom=&dateTo=&purpose=`, plus an optional `?columns=key1,key2,...` to export only the user-selected columns (omit for every column, unchanged from before column selection existed). */
export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
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

  const donationsRaw = await listDonationsForExport(session.tenantId, {
    search,
    dateFrom: req.nextUrl.searchParams.get("dateFrom") ?? undefined,
    dateTo: req.nextUrl.searchParams.get("dateTo") ?? undefined,
    purpose: req.nextUrl.searchParams.get("purpose") ?? undefined,
  });
  const donationsWithPurposes = await resolveDonationPurposes(donationsRaw, locale);
  const donations = await translateFields(donationsWithPurposes, locale, ["donorName"]);

  const generatedAt = new Date();
  const [allColumns, labels] = await Promise.all([
    buildDonationColumnsAndLabels(),
    buildExportMetaLabels(session.displayName, generatedAt),
  ]);
  const columns = filterSelectedColumns(allColumns, req.nextUrl.searchParams.get("columns"));
  if (columns.length === 0) {
    return NextResponse.json({ error: "Select at least one column to export" }, { status: 400 });
  }
  const file = await buildExportFile(formatParam.data as ExportFormat, columns, donations, {
    title: "Donations",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
  });
  return fileResponse(file);
}

const selectedExportSchema = z.object({
  format: formatSchema,
  ids: z.array(z.string()).min(1, "Select at least one donation"),
  columns: z.array(z.string()).optional(),
});

/** Export Selected — POST since a large ID list doesn't fit a GET query string reliably. */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
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
  const donationsRaw = await listDonationsByIdsForExport(session.tenantId, parsed.data.ids);
  const donationsWithPurposes = await resolveDonationPurposes(donationsRaw, locale);
  const donations = await translateFields(donationsWithPurposes, locale, ["donorName"]);

  const generatedAt = new Date();
  const [allColumns, labels] = await Promise.all([
    buildDonationColumnsAndLabels(),
    buildExportMetaLabels(session.displayName, generatedAt),
  ]);
  const columns = filterSelectedColumns(allColumns, parsed.data.columns ?? null);
  if (columns.length === 0) {
    return NextResponse.json({ error: "Select at least one column to export" }, { status: 400 });
  }
  const file = await buildExportFile(parsed.data.format, columns, donations, {
    title: "Donations",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
  });
  return fileResponse(file);
}
