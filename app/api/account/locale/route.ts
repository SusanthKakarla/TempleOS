import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { updateTenantMembershipLocale } from "@/lib/db/tenant-memberships";
import { setLocaleCookie } from "@/lib/i18n/locale";

const bodySchema = z.object({ locale: z.enum(["en", "te"]) });

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await updateTenantMembershipLocale(session.membershipId, parsed.data.locale);
  await setLocaleCookie(parsed.data.locale);

  return NextResponse.json({ ok: true });
}
