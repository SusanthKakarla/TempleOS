import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { deactivateDevotee, updateDevotee } from "@/lib/db/devotees";
import { createFamilyForExistingDevotee } from "@/lib/db/devotee-families";
import { attachExistingDevoteeToFamily, DevoteeFamilyMoveConflictError, DevoteeRegistrationValidationError } from "@/lib/db/devotee-registration";
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

  const { newFamily, familyRelationship, ...devoteeFields } = parsed.data;

  try {
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
    } else if (resolvedFamilyId && familyRelationship) {
      // Attaching to an already-existing family — must go through the same
      // family_members upsert + primary_devotee_id bookkeeping the
      // registration flow uses, not a bare devotees.family_id column write
      // (which would leave the devotee invisible to the family's own member
      // list/count). moveFromExistingFamily: true because this is an
      // explicit admin action from the Edit dialog, not an ambiguous import row.
      await attachExistingDevoteeToFamily(session.tenantId, id, resolvedFamilyId, familyRelationship, true);
    }

    // updateDevotee treats "key present" (even set to undefined) as "update this
    // column" — so when attachExistingDevoteeToFamily already wrote family_id
    // above, the key must be omitted entirely here, not set to undefined,
    // or this would immediately overwrite it back to null.
    const { familyId: _familyId, ...restFields } = devoteeFields;
    const devotee = await updateDevotee(session.tenantId, id, {
      ...restFields,
      ...(familyRelationship ? {} : { familyId: resolvedFamilyId }),
      whatsappPhone: normalizedPhone,
    });
    if (!devotee) {
      return NextResponse.json({ error: "Devotee not found" }, { status: 404 });
    }
    return NextResponse.json({ devotee });
  } catch (err) {
    if (err instanceof DevoteeFamilyMoveConflictError) {
      return NextResponse.json(
        { error: err.message, devoteeId: err.devoteeId, currentFamilyId: err.currentFamilyId },
        { status: 409 },
      );
    }
    if (err instanceof DevoteeRegistrationValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
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
