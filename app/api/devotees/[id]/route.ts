import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { deactivateDevotee, updateDevotee } from "@/lib/db/devotees";
import { createFamilyForExistingDevotee } from "@/lib/db/devotee-families";
import { updateDevoteeSchema } from "@/lib/validation/devotees";
import { normalizePhoneNumber } from "@/lib/phone.mts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateDevoteeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  let normalizedPhone: string | undefined;
  if (parsed.data.whatsappPhone) {
    const result = normalizePhoneNumber(parsed.data.whatsappPhone);
    if (!result) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }
    normalizedPhone = result;
  }

  try {
    const { newFamily, ...devoteeFields } = parsed.data;

    // If creating a new family for this devotee, do it first so we can pass the familyId along
    let resolvedFamilyId = devoteeFields.familyId;
    if (newFamily) {
      const family = await createFamilyForExistingDevotee(session.tenantId, id, newFamily.relationship, {
        familyName: newFamily.familyName,
        address: newFamily.address ?? null,
        city: newFamily.city ?? null,
        state: newFamily.state ?? null,
        pincode: newFamily.pincode ?? null,
      });
      resolvedFamilyId = family.id;
    }

    const devotee = await updateDevotee(session.tenantId, id, {
      ...devoteeFields,
      familyId: resolvedFamilyId,
      whatsappPhone: normalizedPhone,
    });
    if (!devotee) {
      return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
    }
    return NextResponse.json({ devotee });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "A devotee with this phone number already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

/**
 * Soft delete: deactivates rather than removing the row (see
 * lib/db/devotees.ts's deactivateDevotee). Donation and notification
 * history are preserved either way; the devotee just stops being selected
 * for future notifications and drops out of the default list view.
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const deactivated = await deactivateDevotee(session.tenantId, id);
  if (!deactivated) {
    return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
