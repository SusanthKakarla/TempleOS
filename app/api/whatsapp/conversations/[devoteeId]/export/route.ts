import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getTenantById } from "@/lib/db/tenants";
import { getDevoteeById } from "@/lib/db/devotees";
import { listAllMessagesForDevotee } from "@/lib/db/whatsapp-messages";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { WHATSAPP_THREAD_EXPORT_COLUMNS } from "@/lib/export/columns/whatsapp-thread";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

interface RouteParams {
  params: Promise<{ devoteeId: string }>;
}

/** Single devotee's full WhatsApp transcript. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const formatParam = formatSchema.safeParse(req.nextUrl.searchParams.get("format"));
  if (!formatParam.success) {
    return NextResponse.json({ error: "Invalid or missing format" }, { status: 400 });
  }

  const { devoteeId } = await params;
  const [tenant, devotee] = await Promise.all([
    getTenantById(session.tenantId),
    getDevoteeById(session.tenantId, devoteeId),
  ]);
  if (!tenant || !devotee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const messages = await listAllMessagesForDevotee(session.tenantId, devoteeId);

  const file = await buildExportFile(formatParam.data as ExportFormat, WHATSAPP_THREAD_EXPORT_COLUMNS, messages, {
    title: `WhatsApp — ${devotee.displayName}`,
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}
