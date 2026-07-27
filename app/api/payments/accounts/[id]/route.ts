import { NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { disconnectPaymentAccount } from "@/lib/db/tenant-payment-accounts";
import { PaymentAuditService } from "@/lib/payments/payment-audit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const { id } = await params;
  const account = await disconnectPaymentAccount(session.tenantId, id);
  if (!account) {
    return NextResponse.json({ error: "Payment account not found" }, { status: 404 });
  }

  await PaymentAuditService.accountDisconnected(session.tenantId, session.membershipId, account.id);
  return NextResponse.json({ account });
}
