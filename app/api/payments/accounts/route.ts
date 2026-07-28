import { after, NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { connectRazorpayAccountSchema } from "@/lib/validation/payments";
import {
  connectPaymentAccount,
  getActivePaymentAccountForTenant,
  recordPaymentAccountValidation,
} from "@/lib/db/tenant-payment-accounts";
import { validateCredentials } from "@/lib/payments/payment-provider-service";
import { PaymentAuditService } from "@/lib/payments/payment-audit";

export async function GET() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const account = await getActivePaymentAccountForTenant(session.tenantId);
  return NextResponse.json({ account });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = connectRazorpayAccountSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const account = await connectPaymentAccount(session.tenantId, {
    providerKey: parsed.data.providerKey,
    keyId: parsed.data.keyId,
    keySecret: parsed.data.keySecret,
    webhookSecret: parsed.data.webhookSecret ?? null,
  });

  await PaymentAuditService.accountConnected(session.tenantId, session.membershipId, account.id, account.providerKey);

  // Best-effort, non-blocking (mirrors the WhatsApp template-bootstrap posture)
  // — a live Razorpay credential check never blocks or fails the connect response.
  after(() =>
    validateCredentials(account.providerKey, {
      keyId: parsed.data.keyId,
      keySecret: parsed.data.keySecret,
      webhookSecret: parsed.data.webhookSecret ?? null,
    }).then((result) => recordPaymentAccountValidation(account.id, result)),
  );

  return NextResponse.json({ account }, { status: 201 });
}
