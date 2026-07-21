import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { listPreferencesForPerson, upsertPreference } from "@/lib/db/notification-preferences";
import type { NotificationType } from "@/types/db";

const PREFERENCE_TYPES: NotificationType[] = [
  "birthday_priest",
  "user_welcome",
  "devotee_registered",
  "event_reminder",
];

const bodySchema = z.object({
  notificationType: z.enum(["birthday_priest", "user_welcome", "devotee_registered", "event_reminder"]),
  inAppEnabled: z.boolean(),
  whatsappEnabled: z.boolean(),
});

export async function GET() {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const saved = await listPreferencesForPerson(session.personId);
  const savedByType = new Map(saved.map((p) => [p.notificationType, p]));

  const preferences = PREFERENCE_TYPES.map((notificationType) => {
    const existing = savedByType.get(notificationType);
    return {
      notificationType,
      inAppEnabled: existing?.inAppEnabled ?? true,
      whatsappEnabled: existing?.whatsappEnabled ?? true,
    };
  });

  return NextResponse.json({ preferences });
}

export async function PUT(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const preference = await upsertPreference({
    personId: session.personId,
    notificationType: parsed.data.notificationType,
    inAppEnabled: parsed.data.inAppEnabled,
    whatsappEnabled: parsed.data.whatsappEnabled,
  });

  return NextResponse.json({ preference });
}
