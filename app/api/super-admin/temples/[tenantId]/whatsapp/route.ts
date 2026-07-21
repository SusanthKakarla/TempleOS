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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const invalidJson = Symbol("invalid-json");

interface RouteContext {
  params: Promise<{ tenantId: string }>;
}

export async function PUT(req: NextRequest, context: RouteContext) {
  const superAdmin = await requireSuperAdmin().catch(() => undefined);
  if (superAdmin === undefined) {
    return NextResponse.json({ error: "WhatsApp connection failed.", code: "CONNECT_FAILED" }, { status: 500 });
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

  const parsed = manualWhatsAppConnectSchema.safeParse(json);
  if (!parsed.success) {
    return validationErrorResponse(parsed.error.issues[0]?.message ?? "Invalid request.");
  }

  try {
    const account = await manuallyConnectWhatsAppAccount(tenantId, parsed.data);

    await createAuditLogEntry({
      actorType: "super_admin",
      actorId: superAdmin.id,
      tenantId,
      action: "whatsapp_integration.manually_connected",
      targetType: "whatsapp_account",
      targetId: account.id,
      metadata: { metaPhoneNumberId: account.metaPhoneNumberId, metaBusinessAccountId: account.metaBusinessAccountId },
    });

    return NextResponse.json({ whatsappAccount: account });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return validationErrorResponse(conflictMessageFromConstraint(getConstraintName(err)));
    }
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
