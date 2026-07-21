import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { createDevotee, listExistingPhones } from "@/lib/db/devotees";
import {
  addMembersToFamily,
  createFamilyWithMembers,
  getFamilyByName,
  type FamilyMemberInput,
} from "@/lib/db/devotee-families";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";

const rowSchema = z.object({
  rowNumber: z.number(),
  data: z.object({
    displayName: z.string(),
    whatsappPhone: z.string(),
    dateOfBirth: z.string().nullable(),
    birthStar: z.string().nullable(),
    ancestralLineage: z.string().nullable(),
    registrationType: z.enum(["individual", "family"]),
    familyName: z.string().nullable(),
    relationship: z.enum(RELATIONSHIP_CODES).nullable(),
    gender: z.enum(GENDER_OPTIONS).nullable(),
    maritalStatus: z.enum(MARITAL_STATUS_OPTIONS).nullable(),
    weddingAnniversary: z.string().nullable(),
    address: z.string().nullable(),
    city: z.string().nullable(),
    state: z.string().nullable(),
    pincode: z.string().nullable(),
    primaryLanguage: z.enum(["en", "te"]).nullable(),
  }),
  normalizedPhone: z.string().nullable(),
  status: z.enum(["valid", "invalid", "duplicate_in_file", "duplicate_in_db", "empty"]),
  errors: z.array(z.string()),
});
const commitSchema = z.object({ rows: z.array(rowSchema) });
type CommitRow = z.infer<typeof rowSchema>;

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && err.code === "23505";
}

function toMemberInput(row: CommitRow): FamilyMemberInput {
  return {
    displayName: row.data.displayName,
    relationship: row.data.relationship!,
    gender: row.data.gender,
    maritalStatus: row.data.maritalStatus,
    dateOfBirth: row.data.dateOfBirth,
    weddingAnniversary: row.data.weddingAnniversary,
    birthStar: row.data.birthStar,
    ancestralLineage: row.data.ancestralLineage,
    whatsappPhone: row.normalizedPhone,
  };
}

/**
 * Writes only rows the preview step marked "valid" — re-validated here
 * against the DB fresh (never trust client-echoed data; a duplicate could
 * have been added between preview and commit). Individual rows commit one
 * at a time (a single row's conflict doesn't roll back everything else —
 * partial success is a requirement). Family rows commit one *group* at a
 * time in its own transaction (lib/db/devotee-families.ts) — a family group
 * either fully succeeds or the whole group fails together, since a
 * half-created household isn't a meaningful partial result.
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

  const candidateRows = parsed.data.rows.filter((r) => r.status === "valid");
  const individualRows = candidateRows.filter((r) => r.data.registrationType === "individual" && r.normalizedPhone);
  const familyRows = candidateRows.filter((r) => r.data.registrationType === "family");

  const existingPhones = await listExistingPhones(
    session.tenantId,
    [...individualRows, ...familyRows].map((r) => r.normalizedPhone).filter((p): p is string => p !== null),
  );

  let imported = 0;
  let skipped = parsed.data.rows.length - individualRows.length - familyRows.length;
  let failed = 0;
  const errors: { rowNumber: number; message: string }[] = [];
  const seenPhones = new Set<string>();

  for (const row of individualRows) {
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
        gender: row.data.gender,
        maritalStatus: row.data.maritalStatus,
        weddingAnniversary: row.data.weddingAnniversary,
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

  const familyGroups = new Map<string, CommitRow[]>();
  for (const row of familyRows) {
    const key = row.data.familyName!.trim().toLowerCase();
    const group = familyGroups.get(key) ?? [];
    group.push(row);
    familyGroups.set(key, group);
  }

  for (const [, group] of familyGroups) {
    const rowsToImport = group.filter((row) => {
      if (!row.normalizedPhone) return true; // no phone to dedupe
      if (seenPhones.has(row.normalizedPhone) || existingPhones.has(row.normalizedPhone)) return false;
      seenPhones.add(row.normalizedPhone);
      return true;
    });
    skipped += group.length - rowsToImport.length;
    if (rowsToImport.length === 0) continue;

    const familyName = rowsToImport[0].data.familyName!;
    const members = rowsToImport.map(toMemberInput);

    try {
      const existingFamily = await getFamilyByName(session.tenantId, familyName);
      if (existingFamily) {
        await addMembersToFamily(session.tenantId, existingFamily.id, members);
      } else {
        await createFamilyWithMembers(session.tenantId, {
          familyName,
          address: rowsToImport.find((r) => r.data.address)?.data.address ?? null,
          city: rowsToImport.find((r) => r.data.city)?.data.city ?? null,
          state: rowsToImport.find((r) => r.data.state)?.data.state ?? null,
          pincode: rowsToImport.find((r) => r.data.pincode)?.data.pincode ?? null,
          primaryLanguage: rowsToImport.find((r) => r.data.primaryLanguage)?.data.primaryLanguage ?? null,
          members,
        });
      }
      imported += rowsToImport.length;
    } catch (err) {
      failed += rowsToImport.length;
      const message = isUniqueViolation(err)
        ? "A member with this phone number already exists"
        : err instanceof Error
          ? err.message
          : "Failed to import";
      for (const row of rowsToImport) {
        errors.push({ rowNumber: row.rowNumber, message });
      }
    }
  }

  return NextResponse.json({ imported, skipped, failed, errors });
}
