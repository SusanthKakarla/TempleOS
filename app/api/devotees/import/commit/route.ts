import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireTenantAdminSession, tenantAdminAuthResponse } from "@/lib/auth/tenant-admin";
import { requireTenantFeatureApi } from "@/lib/auth/features";
import { createDevotee, getDevoteeByPhone, listExistingPhones } from "@/lib/db/devotees";
import {
  addMembersToFamily,
  createFamilyWithMembers,
  getFamilyByName,
  type FamilyMemberInput,
} from "@/lib/db/devotee-families";
import { createDonation } from "@/lib/db/donations";
import { toISODateString } from "@/lib/date";
import { GENDER_OPTIONS, MARITAL_STATUS_OPTIONS, RELATIONSHIP_CODES } from "@/types/db";

/** No purpose/payment-method columns exist in the devotee importer — these mirror the same defaults app/api/donations/import/commit/route.ts falls back to when those are absent. */
const DEFAULT_DONATION_PURPOSE = "General Donation";
const DEFAULT_DONATION_PAYMENT_METHOD = "other";

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
    donationAmount: z.number().positive().nullable(),
    donationDate: z.string().nullable(),
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

/**
 * Attaches an automatic donation to a devotee resolved from an import row —
 * used for every devotee-import row that carries a Donation amount,
 * regardless of whether that row created a brand-new devotee or matched an
 * already-existing one (a repeat WhatsApp Number in the same file/DB).
 * Failures here never undo the devotee side of the row; they're reported
 * back as a row-level message so partial success is still visible.
 */
async function attachImportedDonation(
  tenantId: string,
  devoteeId: string,
  recordedBy: string | null,
  row: CommitRow,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await createDonation(tenantId, {
      devoteeId,
      manualDonor: null,
      amount: row.data.donationAmount,
      purpose: DEFAULT_DONATION_PURPOSE,
      paymentMethod: DEFAULT_DONATION_PAYMENT_METHOD,
      itemDescription: null,
      notes: null,
      donatedAt: row.data.donationDate ?? toISODateString(new Date()),
      recordedBy,
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Failed to record donation" };
  }
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
 *
 * Rows carrying a Donation amount get an automatic linked donation after
 * their devotee is resolved — for a freshly created devotee this is the row
 * just inserted; for a row the preview step already flagged as a duplicate
 * WhatsApp Number (in-file or in-DB), the donation still attaches to the
 * matching existing devotee even though no new devotee row is created. This
 * is what lets the same phone number appear on multiple rows and produce
 * multiple donations instead of duplicate devotees.
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAdminSession();
  if (!auth.ok) {
    return tenantAdminAuthResponse(auth);
  }
  const { session } = auth;
  const featureBlocked = await requireTenantFeatureApi(session.tenantId, "devotees");
  if (featureBlocked) return featureBlocked;

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
  let donationsImported = 0;
  const errors: { rowNumber: number; message: string }[] = [];
  const seenPhones = new Set<string>();

  /** Rows already known at preview time to be a duplicate (a repeat WhatsApp Number, in-file or in-DB) never create a devotee — but per-row Donation data still needs to land on the devotee that phone already resolves to. Collected here, resolved after every create/family pass below so a duplicate pointing at a devotee created earlier in *this same* commit can still be found. */
  const duplicateDonationRows = parsed.data.rows.filter(
    (r) => (r.status === "duplicate_in_file" || r.status === "duplicate_in_db") && r.normalizedPhone && r.data.donationAmount !== null,
  );

  for (const row of individualRows) {
    const phone = row.normalizedPhone!;
    if (seenPhones.has(phone) || existingPhones.has(phone)) {
      skipped += 1;
      continue;
    }
    seenPhones.add(phone);
    try {
      const devotee = await createDevotee(session.tenantId, {
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
      if (row.data.donationAmount !== null) {
        const result = await attachImportedDonation(session.tenantId, devotee.id, session.membershipId, row);
        if (result.ok) donationsImported += 1;
        else errors.push({ rowNumber: row.rowNumber, message: `Donation not recorded: ${result.message}` });
      }
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
      const result = existingFamily
        ? await addMembersToFamily(session.tenantId, existingFamily.id, members)
        : await createFamilyWithMembers(session.tenantId, {
            familyName,
            address: rowsToImport.find((r) => r.data.address)?.data.address ?? null,
            city: rowsToImport.find((r) => r.data.city)?.data.city ?? null,
            state: rowsToImport.find((r) => r.data.state)?.data.state ?? null,
            pincode: rowsToImport.find((r) => r.data.pincode)?.data.pincode ?? null,
            primaryLanguage: rowsToImport.find((r) => r.data.primaryLanguage)?.data.primaryLanguage ?? null,
            members,
          });
      imported += rowsToImport.length;

      // Match each row that carried a Donation to the family member it just
      // created — greedily consumed by phone first (the reliable key), then
      // by display name for phoneless members, so two rows never both claim
      // the same returned member.
      if (result) {
        const availableMembers = [...result.members];
        for (const row of rowsToImport) {
          if (row.data.donationAmount === null) continue;
          const idx = row.normalizedPhone
            ? availableMembers.findIndex((m) => m.whatsappPhone === row.normalizedPhone)
            : availableMembers.findIndex((m) => m.displayName === row.data.displayName);
          if (idx === -1) continue;
          const [member] = availableMembers.splice(idx, 1);
          const donationResult = await attachImportedDonation(session.tenantId, member.id, session.membershipId, row);
          if (donationResult.ok) donationsImported += 1;
          else errors.push({ rowNumber: row.rowNumber, message: `Donation not recorded: ${donationResult.message}` });
        }
      }
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

  for (const row of duplicateDonationRows) {
    const devotee = await getDevoteeByPhone(session.tenantId, row.normalizedPhone!);
    if (!devotee) continue;
    const result = await attachImportedDonation(session.tenantId, devotee.id, session.membershipId, row);
    if (result.ok) donationsImported += 1;
    else errors.push({ rowNumber: row.rowNumber, message: `Donation not recorded: ${result.message}` });
  }

  return NextResponse.json({ imported, skipped, failed, donationsImported, errors });
}
