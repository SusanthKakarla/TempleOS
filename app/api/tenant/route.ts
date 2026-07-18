import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { updateTenant } from "@/lib/db/tenants";
import { updateTenantSettingsSchema } from "@/lib/validation/tenant-settings";

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = updateTenantSettingsSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const tenant = await updateTenant(session.tenantId, parsed.data);
  return NextResponse.json({ tenant });
}
