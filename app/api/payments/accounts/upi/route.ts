import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { linkUpiManualAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { PaymentAuditService } from "@/lib/payments/payment-audit";
import { manualConnectUpiSchema } from "@/lib/validation/payments";

const invalidJson = Symbol("invalid-json");

/**
 * Tenant self-service UPI connect — the V0 replacement for the gateway
 * connect routes. Unlike Razorpay/PhonePe, there is no live credential
 * check to perform (a UPI VPA isn't a secret, and there's no API to
 * validate it against), so this just persists structurally-valid input.
 * `linkUpiManualAccountForTenant` handles the same "deactivate any prior
 * active account, then upsert" pattern the gateway connect paths use.
 */
export async function PUT(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) return tenantAdminAuthResponse(auth);
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => invalidJson);
  if (json === invalidJson) {
    return NextResponse.json({ error: "Invalid JSON body.", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const parsed = manualConnectUpiSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const account = await linkUpiManualAccountForTenant(session.tenantId, {
      upiVpa: parsed.data.upiVpa,
      payeeName: parsed.data.payeeName,
      qrCodeUrl: parsed.data.qrCodeUrl ?? null,
      bankLabel: parsed.data.bankLabel ?? null,
      defaultDonationNote: parsed.data.defaultDonationNote ?? null,
    });

    await PaymentAuditService.accountConnected(session.tenantId, session.membershipId, account.id, account.providerKey);

    return NextResponse.json({ account });
  } catch (err) {
    console.error("[payments:upi:tenant-connect] Unhandled error while connecting", {
      tenantId: session.tenantId,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Payment connection failed.", code: "CONNECT_FAILED" }, { status: 500 });
  }
}
