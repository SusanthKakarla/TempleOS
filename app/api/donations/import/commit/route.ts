import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createDonation } from "@/lib/db/donations";
import { getDevoteeByPhone } from "@/lib/db/devotees";
import { paymentMethodSchema } from "@/lib/validation/donations";

const rowSchema = z.object({
  rowNumber: z.number(),
  data: z.object({
    donorName: z.string(),
    donorPhone: z.string(),
    donorEmail: z.string(),
    amount: z.number().positive().nullable(),
    purpose: z.string(),
    paymentMethod: paymentMethodSchema.nullable(),
    donatedAt: z.string().nullable(),
    notes: z.string(),
  }),
  normalizedPhone: z.string().nullable(),
  status: z.enum(["valid", "invalid", "empty"]),
  errors: z.array(z.string()),
});
const commitSchema = z.object({ rows: z.array(rowSchema) });

/**
 * Writes only rows the preview step marked "valid" — re-validated here
 * against the DB fresh (never trust client-echoed data). Unlike a
 * single manually-recorded donation (app/api/donations/route.ts), a bulk
 * import never enqueues thank-you/broadcast notifications — these rows are
 * typically historical/backfilled records, not "just happened" donations
 * (same reasoning the devotees/users bulk import already follows: no
 * welcome message is sent for an imported devotee either).
 *
 * If a row's phone matches an existing devotee, the donation links to that
 * devotee (devoteeId) instead of being recorded as a manual donor — this
 * lookup happens fresh per row at commit time, not during preview.
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "donations");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = commitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const candidateRows = parsed.data.rows.filter(
    (r) => r.status === "valid" && r.data.amount !== null && r.data.paymentMethod !== null && r.data.donatedAt !== null,
  );

  let imported = 0;
  const skipped = parsed.data.rows.length - candidateRows.length;
  let failed = 0;
  const errors: { rowNumber: number; message: string }[] = [];

  for (const row of candidateRows) {
    try {
      const devotee = row.normalizedPhone ? await getDevoteeByPhone(session.tenantId, row.normalizedPhone) : null;

      await createDonation(session.tenantId, {
        devoteeId: devotee?.id ?? null,
        manualDonor: devotee
          ? null
          : {
              name: row.data.donorName,
              phone: row.normalizedPhone,
              email: row.data.donorEmail || null,
              address: null,
              isAnonymous: false,
            },
        amount: row.data.amount!,
        purpose: row.data.purpose,
        paymentMethod: row.data.paymentMethod!,
        itemDescription: null,
        notes: row.data.notes || null,
        donatedAt: row.data.donatedAt!,
        recordedBy: session.membershipId,
      });
      imported += 1;
    } catch (err) {
      failed += 1;
      errors.push({ rowNumber: row.rowNumber, message: err instanceof Error ? err.message : "Failed to import" });
    }
  }

  return NextResponse.json({ imported, skipped, failed, errors });
}
