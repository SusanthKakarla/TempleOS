import { NextRequest, NextResponse } from "next/server";
import { getSessionAdmin } from "@/lib/auth/session";
import { listDonationsByDevotee } from "@/lib/db/donations";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const session = await getSessionAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const donations = await listDonationsByDevotee(session.tenantId, id);
  return NextResponse.json({ donations });
}
