import { NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { unsubscribeWabaWebhooks } from "@/lib/whatsapp/embedded-signup";
import { disconnectWhatsAppAccount, getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { createAuditLogEntry } from "@/lib/db/audit-log";

export async function POST() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const account = await getWhatsAppAccountByTenant(session.tenantId);
  if (!account) {
    return NextResponse.json({ error: "No WhatsApp Business account is connected" }, { status: 400 });
  }

  // Best-effort — a failed unsubscribe shouldn't block the admin from disconnecting.
  await unsubscribeWabaWebhooks(account.metaBusinessAccountId);

  await disconnectWhatsAppAccount(session.tenantId);

  await createAuditLogEntry({
    actorType: "tenant_member",
    actorId: session.membershipId,
    tenantId: session.tenantId,
    action: "whatsapp_integration.disconnected",
    targetType: "whatsapp_account",
    targetId: account.id,
    metadata: { metaPhoneNumberId: account.metaPhoneNumberId, metaBusinessAccountId: account.metaBusinessAccountId },
  });

  return NextResponse.json({ ok: true });
}
