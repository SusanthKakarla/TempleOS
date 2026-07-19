import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { listMessagesForDevotee } from "@/lib/db/whatsapp-messages";

interface RouteParams {
  params: Promise<{ devoteeId: string }>;
}

/** "Load older messages" — cursor-paginated by the oldest currently-loaded message's createdAt. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { devoteeId } = await params;
  const before = req.nextUrl.searchParams.get("before") ?? undefined;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const messages = await listMessagesForDevotee(session.tenantId, devoteeId, { before, limit });
  return NextResponse.json({ messages });
}
