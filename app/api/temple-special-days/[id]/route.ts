import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { deleteSpecialDay, updateSpecialDay } from "@/lib/db/temple-special-days";
import { updateSpecialDaySchema } from "@/lib/validation/temple-special-days";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateSpecialDaySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  try {
    const specialDay = await updateSpecialDay(session.tenantId, id, parsed.data);
    if (!specialDay) {
      return NextResponse.json({ error: "Special day not found" }, { status: 404 });
    }
    return NextResponse.json({ specialDay });
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

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const deleted = await deleteSpecialDay(session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Special day not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
