import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import {
  DevoteeFamilyMoveConflictError,
  DevoteeRegistrationValidationError,
  registerDevoteeWithFamilyIntent,
} from "@/lib/db/devotee-registration";
import { devoteeRegistrationSchema } from "@/lib/validation/devotee-registration";

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
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
  const parsed = devoteeRegistrationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const result = await registerDevoteeWithFamilyIntent(session.tenantId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof DevoteeFamilyMoveConflictError) {
      return NextResponse.json(
        {
          error: err.message,
          devoteeId: err.devoteeId,
          currentFamilyId: err.currentFamilyId,
        },
        { status: 409 },
      );
    }
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: "A devotee with this phone number already exists" }, { status: 409 });
    }
    if (err instanceof DevoteeRegistrationValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}
