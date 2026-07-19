import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionAdmin } from "@/lib/auth/session";
import { getTenantById } from "@/lib/db/tenants";
import { listConversations } from "@/lib/db/whatsapp-conversations";
import { buildExportFile, type ExportFormat } from "@/lib/export";
import { fileResponse } from "@/lib/export/response";
import { CONVERSATION_EXPORT_COLUMNS } from "@/lib/export/columns/whatsapp-conversations";
import type { SupportedLanguage } from "@/types/db";

const formatSchema = z.enum(["xlsx", "csv", "pdf"]);

/** Export All / Export Filtered — respects the conversation list's current search/filter state. */
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

  const params = req.nextUrl.searchParams;
  const conversations = await listConversations(session.tenantId, {
    search: params.get("search") ?? undefined,
    language: (params.get("language") as SupportedLanguage | null) ?? undefined,
    period: (params.get("period") as "today" | "week" | null) ?? undefined,
    donorsOnly: params.get("donors") === "true",
    optedInOnly: params.get("optedIn") === "true",
    unreadOnly: params.get("unread") === "true",
  });

  const file = await buildExportFile(formatParam.data as ExportFormat, CONVERSATION_EXPORT_COLUMNS, conversations, {
    title: "WhatsApp Conversations",
    tenantName: tenant.name,
    generatedBy: session.displayName,
    generatedAt: new Date(),
  });
  return fileResponse(file);
}
