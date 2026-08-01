import { after, NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createDevotee, deactivateDevotees, listDevotees } from "@/lib/db/devotees";
import { listTenantMembershipsForTenant } from "@/lib/db/tenant-memberships";
import { createDevoteeSchema } from "@/lib/validation/devotees";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import { formatDateTime } from "@/lib/date";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";

const bulkDeleteSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const search = req.nextUrl.searchParams.get("search") ?? undefined;
  const devotees = await listDevotees(session.tenantId, { search });
  return NextResponse.json({ devotees });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = createDevoteeSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  const normalizedPhone = normalizePhoneNumber(parsed.data.whatsappPhone);
  if (!normalizedPhone) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }

  try {
    const devotee = await createDevotee(session.tenantId, {
      whatsappPhone: normalizedPhone,
      displayName: parsed.data.displayName,
      whatsappOptInStatus: parsed.data.whatsappOptInStatus ?? true,
      dateOfBirth: parsed.data.dateOfBirth ?? null,
      birthStar: parsed.data.birthStar ?? null,
      ancestralLineage: parsed.data.ancestralLineage ?? null,
      gender: parsed.data.gender ?? null,
      maritalStatus: parsed.data.maritalStatus ?? null,
      weddingAnniversary: parsed.data.weddingAnniversary ?? null,
    });

    // New-devotee alert to staff (see migrations/013_notification_engine.sql).
    // Enqueue happens synchronously (fast, bounded DB insert); the actual
    // WhatsApp send happens post-response via after() — mirrors the
    // event-notification pattern in app/api/events/[id]/route.ts.
    const staff = await listTenantMembershipsForTenant(session.tenantId, { status: "active" });
    const eligibleStaff = staff.filter((member) => member.roles.includes("admin") || member.roles.includes("priest"));
    const createdIds: string[] = [];
    for (const member of eligibleStaff) {
      const language = member.preferredUiLanguage ?? "en";
      const created = await enqueueNotification({
        tenantId: session.tenantId,
        recipient: { personId: member.personId },
        notificationType: "devotee_registered",
        category: "devotee",
        language,
        templateVars: {
          devoteeName: devotee.displayName,
          phoneNumber: devotee.whatsappPhone ?? "",
          addedBy: session.displayName,
          registrationTime: formatDateTime(devotee.createdAt, language),
        },
      });
      createdIds.push(...created.map((n) => n.id));
    }
    if (createdIds.length > 0) {
      after(() => processNotifications(createdIds));
    }

    return NextResponse.json({ devotee }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json(
        { error: "A devotee with this phone number already exists" },
        { status: 409 },
      );
    }
    throw err;
  }
}

/** Bulk delete for the Devotees table's multi-select toolbar — same as the existing DELETE /api/devotees/[id] route, this deactivates rather than removes (devotees keep their history and can be reactivated), just batched into one query. */
export async function DELETE(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = bulkDeleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const deactivated = await deactivateDevotees(session.tenantId, parsed.data.ids);
  return NextResponse.json({ deactivated });
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}
