import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { setTenantMemberStatus, TenantMemberActionError } from "@/lib/provisioning/tenant-members";

const bodySchema = z.object({ status: z.enum(["active", "inactive"]) });

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
    const member = await setTenantMemberStatus(
      { membershipId, status: parsed.data.status },
      { type: "tenant_member", tenantId: session.tenantId, membershipId: session.membershipId },
    );
    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof TenantMemberActionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to change status" }, { status: 500 });
  }
}
