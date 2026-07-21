import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/super-admin-session";
import { getTenantById } from "@/lib/db/tenants";
import {
  deleteWhatsAppAccount,
  getWhatsAppAccountByTenant,
  manuallyConnectWhatsAppAccount,
} from "@/lib/db/whatsapp-accounts";
import { createAuditLogEntry } from "@/lib/db/audit-log";
import { getConstraintName, isUniqueViolation } from "@/lib/db/unique-violation";
import { manualWhatsAppConnectSchema } from "@/lib/validation/whatsapp-connect";
import { subscribeWabaWebhooks, unsubscribeWabaWebhooks } from "@/lib/whatsapp/embedded-signup";
import { GRAPH_API_VERSION } from "@/lib/whatsapp/graph-api";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalidJson = Symbol("invalid-json");

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin().catch((err: unknown) => {
    console.error("[whatsapp:manual-connect] requireSuperAdmin threw", {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return undefined;
  });
  if (superAdmin === undefined) {
    return NextResponse.json({ error: "WhatsApp connection failed.", code: "CONNECT_FAILED" }, { status: 500 });
  }
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const { tenantId } = await context.params;
  console.log("[whatsapp:manual-connect] Received Save/Update Connection request", { tenantId });

  if (!uuidPattern.test(tenantId)) {
    console.error("[whatsapp:manual-connect] Aborting — tenantId is not a valid UUID", { tenantId });
    return templeNotFoundResponse();
  }
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.error("[whatsapp:manual-connect] Aborting — no tenant found for tenantId", { tenantId });
    return templeNotFoundResponse();
  }

  const json = await req.json().catch(() => invalidJson);
  if (json === invalidJson) {
    console.error("[whatsapp:manual-connect] Aborting — request body is not valid JSON", { tenantId });
    return validationErrorResponse("Invalid JSON body.");
  }

  const parsed = manualWhatsAppConnectSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[whatsapp:manual-connect] Aborting — validation failed", {
      tenantId,
      issues: parsed.error.issues,
    });
    return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  const existingAccount = await getWhatsAppAccountByTenant(tenantId);
  console.log("[whatsapp:manual-connect] Values loaded before calling Graph API", {
    tenantId,
    temple: tenant.name,
    phoneNumber: parsed.data.phoneNumber,
    metaPhoneNumberId: parsed.data.metaPhoneNumberId,
    metaBusinessAccountId: parsed.data.metaBusinessAccountId,
    businessName: parsed.data.businessName ?? null,
    existingStatus: existingAccount?.status ?? "none (first connection)",
    graphApiVersion: GRAPH_API_VERSION,
    accessTokenExists: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    verifyTokenExists: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    embeddedSignupAppIdExists: Boolean(process.env.NEXT_PUBLIC_WHATSAPP_APP_ID),
    embeddedSignupAppSecretExists: Boolean(process.env.WHATSAPP_APP_SECRET),
    embeddedSignupConfigIdExists: Boolean(process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID),
  });

  try {
    // Without this, Meta never forwards WhatsApp messages to our webhook for
    // this WABA — the number looks "connected" in our DB but the bot never
    // receives anything. A failed subscription doesn't block the connection
    // (mirrors the Embedded Signup callback): the UI shows "Not subscribed"
    // (with Meta's real error) and Update Connection can retry it.
    const webhookResult = await subscribeWabaWebhooks(parsed.data.metaBusinessAccountId);

    const account = await manuallyConnectWhatsAppAccount(tenantId, {
      ...parsed.data,
      webhookSubscribed: webhookResult.success,
      webhookLastErrorCode: webhookResult.success ? null : (webhookResult.errorCode ?? null),
      webhookLastErrorMessage: webhookResult.success ? null : webhookResult.error,
    });

    console.log("[whatsapp:manual-connect] Database update result", {
      tenantId,
      accountId: account.id,
      webhookSubscribed: account.webhookSubscribed,
      webhookLastErrorCode: account.webhookLastErrorCode,
      webhookLastErrorMessage: account.webhookLastErrorMessage,
    });

    await createAuditLogEntry({
      actorType: "super_admin",
      actorId: superAdmin.id,
      tenantId,
      action: "whatsapp_integration.manually_connected",
      targetType: "whatsapp_account",
      targetId: account.id,
      metadata: {
        metaPhoneNumberId: account.metaPhoneNumberId,
        metaBusinessAccountId: account.metaBusinessAccountId,
        webhookSubscribed: account.webhookSubscribed,
        webhookLastErrorCode: account.webhookLastErrorCode,
      },
    });

    return NextResponse.json({ whatsappAccount: account });
  } catch (err) {
    if (isUniqueViolation(err)) {
      console.error("[whatsapp:manual-connect] Unique constraint violation", {
        tenantId,
        constraint: getConstraintName(err),
      });
      return validationErrorResponse(conflictMessageFromConstraint(getConstraintName(err)));
    }
    console.error("[whatsapp:manual-connect] Unhandled error while saving the connection", {
      tenantId,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json({ error: "WhatsApp connection failed.", code: "CONNECT_FAILED" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin().catch(() => undefined);
  if (superAdmin === undefined) {
    return NextResponse.json({ error: "WhatsApp disconnection failed.", code: "DELETE_FAILED" }, { status: 500 });
  }
  if (!superAdmin) {
    return superAdminAuthError();
  }

  const { tenantId } = await context.params;
  if (!uuidPattern.test(tenantId)) {
    return templeNotFoundResponse();
  }

  const account = await getWhatsAppAccountByTenant(tenantId);
  if (!account) {
    return NextResponse.json({ error: "No WhatsApp account is connected for this temple.", code: "NOT_CONNECTED" }, { status: 400 });
  }

  // Best-effort — a failed unsubscribe shouldn't block the delete.
  await unsubscribeWabaWebhooks(account.metaBusinessAccountId);

  // Log before deleting — audit_log.target_id isn't a foreign key, so the entry
  // survives the row's removal, but the identifying fields wouldn't be
  // recoverable from the (now-gone) whatsapp_accounts row afterward.
  await createAuditLogEntry({
    actorType: "super_admin",
    actorId: superAdmin.id,
    tenantId,
    action: "whatsapp_integration.deleted",
    targetType: "whatsapp_account",
    targetId: account.id,
    metadata: {
      phoneNumber: account.phoneNumber,
      metaPhoneNumberId: account.metaPhoneNumberId,
      metaBusinessAccountId: account.metaBusinessAccountId,
    },
  });

  await deleteWhatsAppAccount(tenantId);

  return NextResponse.json({ ok: true });
}

function conflictMessageFromConstraint(constraint: string | undefined): string {
  switch (constraint) {
    case "whatsapp_accounts_phone_number_connected_key":
      return "This phone number is already connected to another temple.";
    case "whatsapp_accounts_meta_phone_number_id_connected_key":
      return "This Meta phone number ID is already connected to another temple.";
    case "whatsapp_accounts_meta_business_account_id_connected_key":
      return "This Meta business account ID is already connected to another temple.";
    default:
      return "This WhatsApp account is already connected to another temple.";
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
