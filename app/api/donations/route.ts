import { after, NextRequest, NextResponse } from "next/server";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createDonation, listDonations } from "@/lib/db/donations";
import { getDevoteeById } from "@/lib/db/devotees";
import { getTenantById } from "@/lib/db/tenants";
import { createDonationSchema } from "@/lib/validation/donations";
import { formatInr } from "@/lib/currency";
import { enqueueNotification } from "@/lib/notifications/engine";
import { processNotifications } from "@/lib/notifications/delivery";

export async function GET(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const params = req.nextUrl.searchParams;
  const donations = await listDonations(session.tenantId, {
    search: params.get("search") ?? undefined,
    devoteeId: params.get("devoteeId") ?? undefined,
    dateFrom: params.get("dateFrom") ?? undefined,
    dateTo: params.get("dateTo") ?? undefined,
  });
  return NextResponse.json({ donations });
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = createDonationSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, {
      status: 400,
    });
  }

  try {
    const donation = await createDonation(session.tenantId, {
      devoteeId: parsed.data.devoteeId,
      amount: parsed.data.amount,
      purpose: parsed.data.purpose,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes ?? null,
      donatedAt: parsed.data.donatedAt,
      recordedBy: session.membershipId,
    });

    // Thank-you WhatsApp message (migrations/016_notification_media.sql adds
    // the reusable banner support). Fire-and-forget, same pattern as
    // devotee_registered in app/api/devotees/route.ts.
    const [devotee, tenant] = await Promise.all([
      getDevoteeById(session.tenantId, donation.devoteeId),
      getTenantById(session.tenantId),
    ]);
    if (devotee && tenant) {
      const language = devotee.preferredLanguage ?? "en";
      const created = await enqueueNotification({
        tenantId: session.tenantId,
        recipient: { devoteeId: devotee.id },
        notificationType: "donation_thank_you",
        category: "donation",
        language,
        templateVars: {
          donorName: devotee.displayName,
          amount: formatInr(donation.amount),
          purpose: donation.purpose,
          templeName: tenant.name,
        },
      });
      if (created.length > 0) {
        after(() => processNotifications(created.map((n) => n.id)));
      }
    }

    return NextResponse.json({ donation }, { status: 201 });
  } catch (err) {
    if (isForeignKeyViolation(err)) {
      return NextResponse.json({ error: "Selected devotee was not found" }, { status: 400 });
    }
    throw err;
  }
}

function isForeignKeyViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23503";
}
