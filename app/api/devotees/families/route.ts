import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { createFamilyWithMembers, listFamiliesForTenant, type FamilyMemberInput } from "@/lib/db/devotee-families";
import { createFamilySchema } from "@/lib/validation/devotee-families";
import { normalizePhoneNumber } from "@/lib/phone.mts";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

/** For the devotee edit dialog's family-reassignment dropdown. */
export async function GET() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const families = await listFamiliesForTenant(session.tenantId);
  return NextResponse.json({ families });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

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
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "A member with this phone number already exists" }, { status: 409 });
    }
    if (err instanceof Error) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
