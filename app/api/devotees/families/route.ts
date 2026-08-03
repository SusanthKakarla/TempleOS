import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import {
  createFamilyWithMembers,
  listFamiliesForTenant,
  FamilyValidationError,
  type FamilyMemberInput,
} from "@/lib/db/devotee-families";
import { createFamilySchema } from "@/lib/validation/devotee-families";
import { normalizePhoneNumber } from "@/lib/phone.mts";

/** For devotee/family pickers. Supports search for same-name household disambiguation. */
export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const search = req.nextUrl.searchParams.get("search");
  const families = await listFamiliesForTenant(session.tenantId, { search });
  return NextResponse.json({ families });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = createFamilySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const members: FamilyMemberInput[] = [];
  for (const member of parsed.data.members) {
    let normalizedPhone: string | null = null;
    if (member.whatsappPhone) {
      normalizedPhone = normalizePhoneNumber(member.whatsappPhone);
      if (!normalizedPhone) {
        return NextResponse.json(
          { error: `Enter a valid phone number for ${member.displayName}` },
          { status: 400 },
        );
      }
    }
    members.push({ ...member, whatsappPhone: normalizedPhone });
  }

  try {
    const result = await createFamilyWithMembers(session.tenantId, {
      familyName: parsed.data.familyName,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      pincode: parsed.data.pincode ?? null,
      primaryLanguage: parsed.data.primaryLanguage ?? null,
      members,
    });
    return NextResponse.json({ family: result.family, members: result.members }, { status: 201 });
  } catch (err) {
    if (err instanceof FamilyValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[devotees:families] Unhandled error while creating family", err);
    return NextResponse.json({ error: "Failed to create family" }, { status: 500 });
  }
}
