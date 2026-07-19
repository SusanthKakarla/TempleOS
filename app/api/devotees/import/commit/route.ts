import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { createDevotee, listExistingPhones } from "@/lib/db/devotees";

const rowSchema = z.object({
  rowNumber: z.number(),
  data: z.object({
    displayName: z.string(),
    whatsappPhone: z.string(),
    dateOfBirth: z.string().nullable(),
    birthStar: z.string().nullable(),
    ancestralLineage: z.string().nullable(),
  }),
  normalizedPhone: z.string().nullable(),
  status: z.enum(["valid", "invalid", "duplicate_in_file", "duplicate_in_db", "empty"]),
  errors: z.array(z.string()),
});
const commitSchema = z.object({ rows: z.array(rowSchema) });

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

/**
 * Writes only rows the preview step marked "valid" — re-validated here
 * against the DB fresh (never trust client-echoed data; a duplicate could
 * have been added between preview and commit). One INSERT per row, not one
 * transaction for the whole batch, so a single row's conflict doesn't roll
 * back everything else — partial success is a requirement.
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
  const existingPhones = await listExistingPhones(
    session.tenantId,
    candidateRows.map((r) => r.normalizedPhone!),
  );

  let imported = 0;
  let skipped = parsed.data.rows.length - candidateRows.length; // already-known invalid/empty/duplicate rows
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
      await createDevotee(session.tenantId, {
        whatsappPhone: phone,
        displayName: row.data.displayName,
        dateOfBirth: row.data.dateOfBirth,
        birthStar: row.data.birthStar,
        ancestralLineage: row.data.ancestralLineage,
      });
      imported += 1;
    } catch (err) {
      if (isUniqueViolation(err)) {
        skipped += 1;
      } else {
        failed += 1;
        errors.push({ rowNumber: row.rowNumber, message: err instanceof Error ? err.message : "Failed to import" });
      }
    }
  }

  return NextResponse.json({ imported, skipped, failed, errors });
}
