import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import {
  deleteFamily,
  getFamilyWithMembers,
  updateFamilyWithMembers,
  type UpdateFamilyMemberInput,
} from "@/lib/db/devotee-families";
import { updateFamilySchema } from "@/lib/validation/devotee-families";
import { normalizePhoneNumber } from "@/lib/phone.mts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const result = await getFamilyWithMembers(session.tenantId, id);
  if (!result) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateFamilySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const members: UpdateFamilyMemberInput[] = [];
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
    const result = await updateFamilyWithMembers(session.tenantId, id, {
      familyName: parsed.data.familyName,
      address: parsed.data.address ?? null,
      city: parsed.data.city ?? null,
      state: parsed.data.state ?? null,
      pincode: parsed.data.pincode ?? null,
      primaryLanguage: parsed.data.primaryLanguage ?? null,
      members,
    });
    if (!result) {
      return NextResponse.json({ error: "Family not found" }, { status: 404 });
    }
    return NextResponse.json(result);
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

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const deleted = await deleteFamily(session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Family not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
