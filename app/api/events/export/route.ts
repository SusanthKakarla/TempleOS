import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAdmin } from "@/lib/auth/session";
import { getTenantById } from "@/lib/db/tenants";
import { listEvents, listEventsByIds } from "@/lib/db/events";
import { eventStatusSchema } from "@/lib/validation/events";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { EVENT_EXPORT_COLUMNS } from "@/lib/export/columns/events";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

/** Export All / Export Filtered — respects the table's current `?status=`. */
export async function GET(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const events = await listEvents(session.tenantId, { status: statusResult?.data });

  const file = await buildExportFile(formatParam.data as ExportFormat, EVENT_EXPORT_COLUMNS, events, {
    title: "Events",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}

const selectedExportSchema = z.object({
  format: formatSchema,
  ids: z.array(z.string()).min(1, "Select at least one event"),
});

/** Export Selected — POST since a large ID list doesn't fit a GET query string reliably. */
export async function POST(req: NextRequest) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await req.json().catch(() => null);
  const parsed = selectedExportSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const tenant = await getTenantById(session.tenantId);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const events = await listEventsByIds(session.tenantId, parsed.data.ids);

  const file = await buildExportFile(parsed.data.format, EVENT_EXPORT_COLUMNS, events, {
    title: "Events",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}
