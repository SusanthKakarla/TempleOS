import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { listPaymentProviders } from "@/lib/db/payment-providers";

/** Platform Payment Settings catalog — every provider row, active or coming-soon. */
export async function GET() {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return NextResponse.json({ error: "Super Admin session required", code: "UNAUTHENTICATED" }, { status: 401 });
  }

  const providers = await listPaymentProviders();
  return NextResponse.json({ providers });
}
