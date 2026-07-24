import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { deactivateDevotee, reactivateDevotee } from "@/lib/db/devotees";

const bodySchema = z.object({ isActive: z.boolean() });

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Reactivates a deactivated devotee (or deactivates, same as DELETE /api/devotees/[id] — kept here too for symmetry). */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const devotee = parsed.data.isActive
    ? await reactivateDevotee(session.tenantId, id)
    : await deactivateDevotee(session.tenantId, id);
  if (!devotee) {
    return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
  }
  return NextResponse.json({ devotee });
}
