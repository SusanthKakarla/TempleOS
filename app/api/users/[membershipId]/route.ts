import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { deleteTenantMember, updateTenantMemberDetails, TenantMemberActionError } from "@/lib/provisioning/tenant-members";

const bodySchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(200).optional(),
  preferredUiLanguage: z.enum(["en", "te"]).optional(),
});

interface RouteParams {
  params: Promise<{ membershipId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
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
    const member = await updateTenantMemberDetails(
      { membershipId, ...parsed.data },
      { type: "tenant_member", tenantId: session.tenantId, membershipId: session.membershipId },
    );
    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof TenantMemberActionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { membershipId } = await params;

  try {
    await deleteTenantMember(
      { membershipId },
      { type: "tenant_member", tenantId: session.tenantId, membershipId: session.membershipId },
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof TenantMemberActionError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
