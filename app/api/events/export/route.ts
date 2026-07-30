import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { getTenantById } from "@/lib/db/tenants";
import { listEvents, listEventsByIds } from "@/lib/db/events";
import { eventStatusSchema } from "@/lib/validation/events";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { buildExportMetaLabels } from "@/lib/export/locale-labels";
import { buildEventExportColumns, type EventExportLabels } from "@/lib/export/columns/events";
import { getLocaleCookie } from "@/lib/i18n/locale";
import { translateFields } from "@/lib/i18n/translate-rows";
import type { EventStatus } from "@/types/db";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);
const EVENT_STATUS_VALUES: EventStatus[] = ["published", "draft", "cancelled"];

async function buildEventColumnsAndLabels() {
  const [t, tStatus] = await Promise.all([getTranslations("exportLabels.events"), getTranslations("events.status")]);
  const labels: EventExportLabels = {
    headers: {
      title: t("title"),
      status: t("status"),
      starts: t("starts"),
      ends: t("ends"),
      location: t("location"),
      description: t("description"),
    },
    statusLabels: Object.fromEntries(EVENT_STATUS_VALUES.map((value) => [value, tStatus(value)])),
  };
  return buildEventExportColumns(labels);
}

/** Export All / Export Filtered — respects the table's current `?status=`. */
export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "events");
  if (featureBlocked) return featureBlocked;

  const formatParam = formatSchema.safeParse(req.nextUrl.searchParams.get("format"));
  if (!formatParam.success) {
    return NextResponse.json({ error: "Invalid or missing format" }, { status: 400 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const statusParam = req.nextUrl.searchParams.get("status");
  const statusResult = statusParam ? eventStatusSchema.safeParse(statusParam) : undefined;
  if (statusParam && !statusResult?.success) {
    return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
  }

  const locale = await getLocaleCookie();
  const eventsRaw = await listEvents(session.tenantId, { status: statusResult?.data });
  const events = await translateFields(eventsRaw, locale, ["title", "description"]);

  const generatedAt = new Date();
  const [columns, labels] = await Promise.all([
    buildEventColumnsAndLabels(),
    buildExportMetaLabels(session.displayName, generatedAt),
  ]);
  const file = await buildExportFile(formatParam.data as ExportFormat, columns, events, {
    title: "Events",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
  });
  return fileResponse(file);
}

const selectedExportSchema = z.object({
  format: formatSchema,
  ids: z.array(z.string()).min(1, "Select at least one event"),
});

/** Export Selected — POST since a large ID list doesn't fit a GET query string reliably. */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "events");
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
  const eventsRaw = await listEventsByIds(session.tenantId, parsed.data.ids);
  const events = await translateFields(eventsRaw, locale, ["title", "description"]);

  const generatedAt = new Date();
  const [columns, labels] = await Promise.all([
    buildEventColumnsAndLabels(),
    buildExportMetaLabels(session.displayName, generatedAt),
  ]);
  const file = await buildExportFile(parsed.data.format, columns, events, {
    title: "Events",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt,
    labels,
  });
  return fileResponse(file);
}
