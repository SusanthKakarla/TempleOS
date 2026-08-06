import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { getTenantById } from "@/lib/db/tenants";
import { connectPaymentAccountForSuperAdmin, markPaymentAccountVerified } from "@/lib/db/tenant-payment-accounts";
import { validateCredentials } from "@/lib/payments/payment-provider-service";
import { PaymentAuditService } from "@/lib/payments/payment-audit";
import { manualConnectPhonepeSchema } from "@/lib/validation/payments";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalidJson = Symbol("invalid-json");

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * Super Admin manual-connect/update for a temple's PhonePe credentials —
 * same "validate against the provider's live API before ever saving
 * anything" posture as the sibling Razorpay route
 * (app/api/super-admin/temples/[tenantId]/payments/route.ts). Kept as a
 * separate sibling route (rather than a `provider` discriminator on the
 * existing one) so the Razorpay route's existing tests/shape are untouched.
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin().catch((err: unknown) => {
    console.error("[payments:phonepe:super-admin-connect] requireSuperAdmin threw", {
      message: err instanceof Error ? err.message : String(err),
    });
    return undefined;
  });
  if (superAdmin === undefined) return connectFailedResponse();
  if (!superAdmin) return superAdminAuthError();

  const { tenantId } = await context.params;
  if (!uuidPattern.test(tenantId)) return templeNotFoundResponse();

  try {
    const tenant = await getTenantById(tenantId);
    if (!tenant) return templeNotFoundResponse();

    const json = await req.json().catch(() => invalidJson);
    if (json === invalidJson) return validationErrorResponse("Invalid JSON body.");

    const parsed = manualConnectPhonepeSchema.safeParse(json);
    if (!parsed.success) {
      return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request.");
    }

    const validation = await validateCredentials("phonepe", {
      keyId: parsed.data.clientId,
      keySecret: parsed.data.clientSecret,
      webhookSecret: parsed.data.webhookSecret ?? null,
      providerMerchantId: parsed.data.merchantId,
      environment: parsed.data.environment,
    });
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: `PhonePe rejected these credentials: ${validation.error}`,
          code: "PHONEPE_API_ERROR",
          statusCode: validation.statusCode,
        },
        { status: 502 },
      );
    }

    const account = await connectPaymentAccountForSuperAdmin(tenantId, {
      providerKey: "phonepe",
      keyId: parsed.data.clientId,
      keySecret: parsed.data.clientSecret,
      webhookSecret: parsed.data.webhookSecret ?? null,
      providerMerchantId: parsed.data.merchantId,
      environment: parsed.data.environment,
    });

    await markPaymentAccountVerified(account.id);
    await PaymentAuditService.accountConnectedBySuperAdmin(tenantId, superAdmin.id, account.id, account.providerKey);

    return NextResponse.json({
      account: { ...account, lastValidatedAt: new Date().toISOString(), lastValidationError: null },
    });
  } catch (err) {
    console.error("[payments:phonepe:super-admin-connect] Unhandled error while connecting", {
      tenantId,
      message: err instanceof Error ? err.message : String(err),
    });
    return connectFailedResponse();
  }
}

function templeNotFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Temple not found.", code: "TEMPLE_NOT_FOUND" }, { status: 404 });
}

function validationErrorResponse(message: string): NextResponse {
  return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
}

function superAdminAuthError(): NextResponse {
  return NextResponse.json({ error: "Super Admin session required", code: "UNAUTHENTICATED" }, { status: 401 });
}

function connectFailedResponse(): NextResponse {
  return NextResponse.json({ error: "Payment connection failed.", code: "CONNECT_FAILED" }, { status: 500 });
}
