import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { getTenantById } from "@/lib/db/tenants";
import { connectPaymentAccountForSuperAdmin, disconnectPaymentAccount, getActivePaymentAccountForTenant } from "@/lib/db/tenant-payment-accounts";
import { validateCredentials } from "@/lib/payments/payment-provider-service";
import { PaymentAuditService } from "@/lib/payments/payment-audit";
import { superAdminConnectRazorpaySchema } from "@/lib/validation/payments";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalidJson = Symbol("invalid-json");

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

/**
 * Super Admin manual-connect/update for a temple's Razorpay keys — the same
 * "validate against the provider's live API before ever saving anything"
 * posture as app/api/super-admin/temples/[tenantId]/whatsapp/route.ts's PUT.
 * A temple's own tenant-admin self-service card only offers Partner OAuth
 * now (see features/payments/razorpay-connection-card.tsx); this route is
 * the one remaining way to set manual Key ID/Key Secret credentials for an
 * existing temple, alongside the provisioning wizard's creation-time option.
 */
export async function PUT(req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin().catch(() => undefined);
  if (superAdmin === undefined) {
    return connectFailedResponse();
  }
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const { tenantId } = await context.params;
  if (!uuidPattern.test(tenantId)) {
    return templeNotFoundResponse();
  }
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return templeNotFoundResponse();
  }

  const json = await req.json().catch(() => invalidJson);
  if (json === invalidJson) {
    return validationErrorResponse("Invalid JSON body.");
  }

  const parsed = superAdminConnectRazorpaySchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  // Nothing is saved if the keys don't actually work — same "prove it live
  // before persisting" rule the WhatsApp manual-connect route follows for
  // the Phone Number ID / WABA.
  const validation = await validateCredentials("razorpay", {
    keyId: parsed.data.keyId,
    keySecret: parsed.data.keySecret,
    webhookSecret: parsed.data.webhookSecret ?? null,
  });
  if (!validation.ok) {
    return NextResponse.json(
      {
        error: `Razorpay rejected these credentials: ${validation.error}`,
        code: "RAZORPAY_API_ERROR",
        statusCode: validation.statusCode,
        razorpayError: validation.razorpayError,
      },
      { status: 502 },
    );
  }

  try {
    const account = await connectPaymentAccountForSuperAdmin(tenantId, {
      providerKey: "razorpay",
      keyId: parsed.data.keyId,
      keySecret: parsed.data.keySecret,
      webhookSecret: parsed.data.webhookSecret ?? null,
    });

    await PaymentAuditService.accountConnectedBySuperAdmin(tenantId, superAdmin.id, account.id, account.providerKey);

    return NextResponse.json({ account });
  } catch {
    return connectFailedResponse();
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin().catch(() => undefined);
  if (superAdmin === undefined) {
    return disconnectFailedResponse();
  }
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const { tenantId } = await context.params;
  if (!uuidPattern.test(tenantId)) {
    return templeNotFoundResponse();
  }

  const account = await getActivePaymentAccountForTenant(tenantId);
  if (!account) {
    return NextResponse.json(
      { error: "No payment account is connected for this temple.", code: "NOT_CONNECTED" },
      { status: 400 },
    );
  }

  await disconnectPaymentAccount(tenantId, account.id);
  await PaymentAuditService.accountDisconnectedBySuperAdmin(tenantId, superAdmin.id, account.id);

  return NextResponse.json({ ok: true });
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

function disconnectFailedResponse(): NextResponse {
  return NextResponse.json({ error: "Payment disconnection failed.", code: "DELETE_FAILED" }, { status: 500 });
}
