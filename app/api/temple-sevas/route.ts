import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { createSeva } from "@/lib/db/temple-sevas";
import { createSevaSchema } from "@/lib/validation/temple-sevas";

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = createSevaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const seva = await createSeva(session.tenantId, {
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    price: parsed.data.price ?? null,
    duration: parsed.data.duration ?? null,
    availableDays: parsed.data.availableDays,
    bookingEnabled: parsed.data.bookingEnabled,
  });
  return NextResponse.json({ seva }, { status: 201 });
}
