import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { markConversationRead } from "@/lib/db/whatsapp-conversations";

interface RouteParams {
  params: Promise<{ devoteeId: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { devoteeId } = await params;
  await markConversationRead(session.tenantId, devoteeId);
  return NextResponse.json({ ok: true });
}
