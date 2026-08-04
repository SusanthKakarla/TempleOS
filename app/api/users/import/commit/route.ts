import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { listActiveMemberPhonesForTenant } from "@/lib/db/tenant-memberships";
import { inviteTenantMember, TenantMemberActionError } from "@/lib/provisioning/tenant-members";
import { validateImportRow } from "@/lib/validation/user-import";

const rowSchema = z.object({
  rowNumber: z.number(),
  data: z.object({
    displayName: z.string(),
    phone: z.string(),
    roles: z.array(z.string()),
  }),
});
const commitSchema = z.object({ rows: z.array(rowSchema) });

/**
 * Writes only rows that pass validateImportRow's own checks when re-run
 * server-side against the raw echoed name/phone/roles — the client-supplied
 * `status`/`normalizedPhone` fields are never trusted (a direct API call
 * bypassing the preview step, or a corrupted client state, could otherwise
 * commit an unnormalized phone, a blank name, or zero roles). One
 * inviteTenantMember call per row, not one transaction for the whole batch,
 * so a single row's conflict doesn't roll back everything else — partial
 * success is a requirement.
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "user_management");
  if (featureBlocked) return featureBlocked;

  const json = await req.json().catch(() => null);
  const parsed = commitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  // Re-derive validity from the raw fields instead of trusting the client's
  // status/normalizedPhone — existingPhones is intentionally computed against
  // ALL rows up front (not just client-labeled "valid" ones) so duplicate
  // detection can't be bypassed by mislabeling a row.
  const allPhones = parsed.data.rows
    .map((r) => r.data.phone)
    .filter((phone): phone is string => Boolean(phone.trim()));
  const existingPhones = await listActiveMemberPhonesForTenant(session.tenantId, allPhones);

  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { rowNumber: number; message: string }[] = [];
  const seenPhones = new Set<string>();

  for (const row of parsed.data.rows) {
    const revalidated = validateImportRow(
      row.rowNumber,
      { name: row.data.displayName, phone: row.data.phone, roles: row.data.roles.join(",") },
      seenPhones,
      existingPhones,
    );
    if (revalidated.status !== "valid" || !revalidated.normalizedPhone) {
      skipped += 1;
      continue;
    }
    const phone = revalidated.normalizedPhone;
    seenPhones.add(phone);
    try {
      await inviteTenantMember(
        { phoneNumber: phone, displayName: revalidated.data.displayName, roles: revalidated.data.roles as never },
        { type: "tenant_member", tenantId: session.tenantId, membershipId: session.membershipId },
      );
      imported += 1;
    } catch (err) {
      if (err instanceof TenantMemberActionError && err.code === "ALREADY_MEMBER") {
        skipped += 1;
      } else {
        failed += 1;
        errors.push({
          rowNumber: row.rowNumber,
          message: err instanceof TenantMemberActionError ? err.message : "Failed to import",
        });
      }
    }
  }

  return NextResponse.json({ imported, skipped, failed, errors });
}
