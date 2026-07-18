import { NextRequest, NextResponse } from "next/server";
import { requireLegacyTenantSuperAdmin } from "@/lib/auth/session";
import { createAdmin, listAdmins } from "@/lib/db/admin-users";
import { createAdminSchema } from "@/lib/validation/admins";
import { normalizePhoneNumber } from "@/lib/phone.mts";

export async function GET() {
  const admin = await requireLegacyTenantSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admins = await listAdmins(admin.tenantId);
  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  const admin = await requireLegacyTenantSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const json = await req.json().catch(() => null);
  const parsed = createAdminSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const normalizedPhone = normalizePhoneNumber(parsed.data.phoneNumber);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  try {
    const created = await createAdmin(admin.tenantId, {
      phoneNumber: normalizedPhone,
      displayName: parsed.data.displayName,
      role: parsed.data.role,
    });
    return NextResponse.json({ admin: created }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "An admin with this phone number already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
