import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { listMessagesForDevotee } from "@/lib/db/whatsapp-messages";

interface RouteParams {
  params: Promise<{ devoteeId: string }>;
}

/** "Load older messages" — cursor-paginated by the oldest currently-loaded message's createdAt. */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { devoteeId } = await params;
  const before = req.nextUrl.searchParams.get("before") ?? undefined;
  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const messages = await listMessagesForDevotee(session.tenantId, devoteeId, { before, limit });
  return NextResponse.json({ messages });
}
