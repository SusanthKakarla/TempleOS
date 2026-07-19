import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { changeTenantMemberRoles, TenantMemberActionError } from "@/lib/provisioning/tenant-members";
import { isRoleCode } from "@/types/db";

const bodySchema = z.object({
  roles: z.array(z.string()).refine((roles) => roles.every(isRoleCode), "Unknown role code"),
});

interface RouteParams {
  params: Promise<{ membershipId: string }>;
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { membershipId } = await params;
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  try {
    const member = await changeTenantMemberRoles(
      { membershipId, roles: parsed.data.roles as never },
      { type: "tenant_member", tenantId: session.tenantId, membershipId: session.membershipId },
    );
    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof TenantMemberActionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to change roles" }, { status: 500 });
  }
}
