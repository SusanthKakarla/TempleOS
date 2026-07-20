import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { TENANT_SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { addSuperAdmin, listActiveSuperAdmins } from "@/lib/db/super-admins";
import { createAuditLogEntry } from "@/lib/db/audit-log";

const addSuperAdminSchema = z.object({
  phoneNumber: z.string().min(1),
  displayName: z.string().min(1),
});

export async function GET() {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const admins = await listActiveSuperAdmins();
  return NextResponse.json({ admins });
}

export async function POST(req: NextRequest) {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const json = await req.json().catch(() => null);
  const parsed = addSuperAdminSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  try {
    const created = await addSuperAdmin(parsed.data);
    await createAuditLogEntry({
      actorType: "super_admin",
      actorId: superAdmin.id,
      tenantId: null,
      action: "super_admin.added",
      targetType: "super_admin",
      targetId: created.id,
      metadata: { phoneNumber: created.phoneNumber, displayName: created.displayName },
    });
    return NextResponse.json({ admin: created }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to add Super Admin" },
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
