import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { deactivateSuperAdmin } from "@/lib/db/super-admins";
import { createAuditLogEntry } from "@/lib/db/audit-log";

const bodySchema = z.object({ active: z.literal(false) });

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const { id } = await params;
  if (id === superAdmin.id) {
    return NextResponse.json(
      { error: "You cannot deactivate your own Super Admin account." },
      { status: 400 },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const deactivated = await deactivateSuperAdmin(id);
    await createAuditLogEntry({
      actorType: "super_admin",
      actorId: superAdmin.id,
      tenantId: null,
      action: "super_admin.deactivated",
      targetType: "super_admin",
      targetId: deactivated.id,
      metadata: { phoneNumber: deactivated.phoneNumber, displayName: deactivated.displayName },
    });
    return NextResponse.json({ admin: deactivated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to deactivate Super Admin" },
      { status: 400 },
    );
  }
}

async function superAdminAuthError(): Promise<NextResponse> {
  const store = await cookies();
  const tenantToken = store.get(TENANT_SESSION_COOKIE_NAME)?.value;
  const hasTenantSession = tenantToken ? Boolean(verifySessionToken(tenantToken)) : false;

  if (hasTenantSession) {
    return NextResponse.json(
      { error: "Super Admin access required", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  return NextResponse.json(
    { error: "Super Admin session required", code: "UNAUTHENTICATED" },
    { status: 401 },
  );
}
