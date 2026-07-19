import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { listActiveMemberPhonesForTenant } from "@/lib/db/tenant-memberships";
import { inviteTenantMember, TenantMemberActionError } from "@/lib/provisioning/tenant-members";
import { isRoleCode } from "@/types/db";

const rowSchema = z.object({
  rowNumber: z.number(),
  data: z.object({
    displayName: z.string(),
    phone: z.string(),
    roles: z.array(z.string()).refine((roles) => roles.every(isRoleCode), "Unknown role code"),
  }),
  normalizedPhone: z.string().nullable(),
  status: z.enum(["valid", "invalid", "duplicate_in_file", "duplicate_in_db", "empty"]),
  errors: z.array(z.string()),
});
const commitSchema = z.object({ rows: z.array(rowSchema) });

/**
 * Writes only rows the preview step marked "valid" — re-validated here
 * against the DB fresh (never trust client-echoed data). One
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

  const json = await req.json().catch(() => null);
  const parsed = commitSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }

  const candidateRows = parsed.data.rows.filter((r) => r.status === "valid" && r.normalizedPhone);
  const existingPhones = await listActiveMemberPhonesForTenant(
    session.tenantId,
    candidateRows.map((r) => r.normalizedPhone!),
  );

  let imported = 0;
  let skipped = parsed.data.rows.length - candidateRows.length;
  let failed = 0;
  const errors: { rowNumber: number; message: string }[] = [];
  const seenPhones = new Set<string>();

  for (const row of candidateRows) {
    const phone = row.normalizedPhone!;
    if (seenPhones.has(phone) || existingPhones.has(phone)) {
      skipped += 1;
      continue;
    }
    seenPhones.add(phone);
    try {
      await inviteTenantMember(
        { phoneNumber: phone, displayName: row.data.displayName, roles: row.data.roles as never },
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
