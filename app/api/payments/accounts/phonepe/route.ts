import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { connectPaymentAccountForSuperAdmin, markPaymentAccountVerified } from "@/lib/db/tenant-payment-accounts";
import { validateCredentials } from "@/lib/payments/payment-provider-service";
import { PaymentAuditService } from "@/lib/payments/payment-audit";
import { manualConnectPhonepeSchema } from "@/lib/validation/payments";

const invalidJson = Symbol("invalid-json");

/**
 * Tenant self-service manual PhonePe connect — used by both the Settings
 * page's "Manual Configuration" form and the guided setup wizard's final
 * "paste what you copied from PhonePe Business Dashboard" step (Method 1
 * and Method 2 collect the same fields; they only differ in how the temple
 * admin is walked through getting them). Same "validate live before
 * persisting" posture as the Super Admin route and Razorpay's own manual
 * connect. `connectPaymentAccountForSuperAdmin` is not super-admin-specific
 * despite its name — it just deactivates any prior active account and
 * upserts a fresh manual row, identical to what a tenant admin needs here.
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

  const parsed = manualConnectPhonepeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request.", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  try {
    const validation = await validateCredentials("phonepe", {
      keyId: parsed.data.clientId,
      keySecret: parsed.data.clientSecret,
      webhookSecret: parsed.data.webhookSecret ?? null,
      providerMerchantId: parsed.data.merchantId,
      environment: parsed.data.environment,
    });
    if (!validation.ok) {
      return NextResponse.json(
        { error: `PhonePe rejected these credentials: ${validation.error}`, code: "PHONEPE_API_ERROR" },
        { status: 502 },
      );
    }

    const account = await connectPaymentAccountForSuperAdmin(session.tenantId, {
      providerKey: "phonepe",
      keyId: parsed.data.clientId,
      keySecret: parsed.data.clientSecret,
      webhookSecret: parsed.data.webhookSecret ?? null,
      providerMerchantId: parsed.data.merchantId,
      environment: parsed.data.environment,
    });

    await markPaymentAccountVerified(account.id);
    await PaymentAuditService.accountConnected(session.tenantId, session.membershipId, account.id, account.providerKey);

    return NextResponse.json({
      account: { ...account, lastValidatedAt: new Date().toISOString(), lastValidationError: null },
    });
  } catch (err) {
    console.error("[payments:phonepe:tenant-connect] Unhandled error while connecting", {
      tenantId: session.tenantId,
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Payment connection failed.", code: "CONNECT_FAILED" }, { status: 500 });
  }
}
