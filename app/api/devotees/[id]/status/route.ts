import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { deactivateDevotee, reactivateDevotee } from "@/lib/db/devotees";
import { isUniqueViolation } from "@/lib/db/unique-violation";

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
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const devotee = parsed.data.isActive
      ? await reactivateDevotee(session.tenantId, id)
      : await deactivateDevotee(session.tenantId, id);
    if (!devotee) {
      return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
    }
    return NextResponse.json({ devotee });
  } catch (err) {
    // Only reachable when reactivating: since migration 035, a phone number
    // is unique among active devotees only, so this devotee's number may
    // since have been claimed by a different (newer) active devotee.
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "Another active devotee already uses this phone number — update or deactivate that one first" },
        { status: 409 },
      );
    }
    throw err;
  }
}
