import { NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { getEventById } from "@/lib/db/events";
import { getTenantById } from "@/lib/db/tenants";
import { getWhatsAppAccountByTenant } from "@/lib/db/whatsapp-accounts";
import { listOptedInDevotees } from "@/lib/db/devotees";
import { logWhatsAppMessage } from "@/lib/db/whatsapp-messages";
import { buildAnnouncementMessage } from "@/lib/whatsapp/templates";
import { sendTextMessage } from "@/lib/whatsapp/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const { id } = await params;

  const event = await getEventById(session.tenantId, id);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  if (event.status !== "published") {
    return NextResponse.json(
      { error: "Only published events can be announced" },
      { status: 400 },
    );
  }

  const tenant = await getTenantById(session.tenantId);
  const whatsappAccount = await getWhatsAppAccountByTenant(session.tenantId);
  if (!tenant || !whatsappAccount) {
    return NextResponse.json(
      { error: "WhatsApp is not connected for this temple yet" },
      { status: 400 },
    );
  }

  const recipients = await listOptedInDevotees(session.tenantId);

  let sent = 0;
  let failed = 0;

  for (const devotee of recipients) {
    // Devotees who haven't picked a language yet (preferredLanguage === null)
    // default to English for broadcast announcements — there's no live
    // conversation here to gate on a language picker first.
    const message = buildAnnouncementMessage(tenant, event, devotee.preferredLanguage ?? "en");
    const result = await sendTextMessage(whatsappAccount.metaPhoneNumberId, devotee.whatsappPhone, message);
    await logWhatsAppMessage(session.tenantId, {
      devoteeId: devotee.id,
      direction: "outbound",
      fromPhone: whatsappAccount.phoneNumber,
      toPhone: devotee.whatsappPhone,
      body: message,
      messageType: "text",
      status: result.success ? "sent" : "failed",
      providerMessageId: result.providerMessageId,
    });
    if (result.success) {
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return NextResponse.json({ total: recipients.length, sent, failed });
}
