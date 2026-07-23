import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { embeddedSignupCallbackSchema } from "@/lib/validation/whatsapp-connect";
import {
  exchangeCodeForConfirmation,
  fetchPhoneNumberDetails,
  fetchWabaDetails,
  subscribeWabaWebhooks,
} from "@/lib/whatsapp/embedded-signup";
import { completeEmbeddedSignup, getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { createAuditLogEntry } from "@/lib/db/audit-log";

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = embeddedSignupCallbackSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { code, wabaId, phoneNumberId } = parsed.data;

  const confirmation = await exchangeCodeForConfirmation(code);
  if (!confirmation.success) {
    return NextResponse.json({ error: confirmation.error }, { status: 400 });
  }

  const [phoneDetails, wabaDetails] = await Promise.all([
    fetchPhoneNumberDetails(phoneNumberId),
    fetchWabaDetails(wabaId),
  ]);
  if (!phoneDetails.success) {
    return NextResponse.json({ error: phoneDetails.error }, { status: 502 });
  }
  if (!wabaDetails.success) {
    return NextResponse.json({ error: wabaDetails.error }, { status: 502 });
  }

  // A failed webhook subscription doesn't block the connection — the admin
  // sees "Not subscribed" in the UI and Reconnect can retry it.
  const webhookResult = await subscribeWabaWebhooks(wabaId);

  const existingAccount = await getWhatsAppAccountByTenant(session.tenantId);

  const account = await completeEmbeddedSignup(session.tenantId, {
    phoneNumber: phoneDetails.displayPhoneNumber,
    metaPhoneNumberId: phoneNumberId,
    metaBusinessAccountId: wabaId,
    businessName: wabaDetails.businessName ?? phoneDetails.verifiedName ?? null,
    phoneVerificationStatus: phoneDetails.codeVerificationStatus,
    webhookSubscribed: webhookResult.success,
    webhookLastErrorCode: webhookResult.success ? null : (webhookResult.errorCode ?? null),
    webhookLastErrorMessage: webhookResult.success ? null : webhookResult.error,
  });

  await createAuditLogEntry({
    actorType: "tenant_member",
    actorId: session.membershipId,
    tenantId: session.tenantId,
    action: existingAccount ? "whatsapp_integration.reconnected" : "whatsapp_integration.connected",
    targetType: "whatsapp_account",
    targetId: account.id,
    metadata: { metaPhoneNumberId: phoneNumberId, metaBusinessAccountId: wabaId },
  });

  return NextResponse.json({ account });
}
