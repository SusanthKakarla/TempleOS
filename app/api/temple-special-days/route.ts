import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { createSpecialDay } from "@/lib/db/temple-special-days";
import { createSpecialDaySchema } from "@/lib/validation/temple-special-days";

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = createSpecialDaySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  try {
    const specialDay = await createSpecialDay(session.tenantId, {
      date: parsed.data.date,
      occasion: parsed.data.occasion,
      isClosed: parsed.data.isClosed,
      morningOpen: parsed.data.morningOpen ?? null,
      morningClose: parsed.data.morningClose ?? null,
      eveningOpen: parsed.data.eveningOpen ?? null,
      eveningClose: parsed.data.eveningClose ?? null,
    });
    return NextResponse.json({ specialDay }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "A special day entry already exists for this date" },
        { status: 409 },
      );
    }
    throw err;
  }
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
