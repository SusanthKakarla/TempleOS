import { NextRequest, NextResponse } from "next/server";
import { requireLegacyTenantSuperAdmin } from "@/lib/auth/session";
import { countSuperAdmins, deleteAdminById, getAdminById, updateAdminRole } from "@/lib/db/admin-users";
import { updateAdminRoleSchema } from "@/lib/validation/admins";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = await requireLegacyTenantSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const json = await req.json().catch(() => null);
  const parsed = updateAdminRoleSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const target = await getAdminById(id);
  if (!target || target.tenantId !== admin.tenantId) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  if (target.role === "super_admin" && parsed.data.role !== "super_admin") {
    const superAdminCount = await countSuperAdmins(admin.tenantId);
    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Can't demote the last remaining Super Admin" },
        { status: 400 },
      );
    }
  }

  const updated = await updateAdminRole(admin.tenantId, id, parsed.data.role);
  return NextResponse.json({ admin: updated });
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const admin = await requireLegacyTenantSuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const target = await getAdminById(id);
  if (!target || target.tenantId !== admin.tenantId) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  if (target.role === "super_admin") {
    const superAdminCount = await countSuperAdmins(admin.tenantId);
    if (superAdminCount <= 1) {
      return NextResponse.json(
        { error: "Can't remove the last remaining Super Admin" },
        { status: 400 },
      );
    }
  }

  await deleteAdminById(admin.tenantId, id);
  return NextResponse.json({ ok: true });
}
