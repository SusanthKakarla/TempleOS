import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { deleteSeva, updateSeva } from "@/lib/db/temple-sevas";
import { updateSevaSchema } from "@/lib/validation/temple-sevas";

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
  const parsed = updateSevaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const seva = await updateSeva(session.tenantId, id, parsed.data);
  if (!seva) {
    return NextResponse.json({ error: "Seva not found" }, { status: 404 });
  }
  return NextResponse.json({ seva });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;
  const deleted = await deleteSeva(session.tenantId, id);
  if (!deleted) {
    return NextResponse.json({ error: "Seva not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
