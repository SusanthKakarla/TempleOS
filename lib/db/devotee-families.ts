import { getPool } from "./pool";
import { getDevoteeById } from "./devotees";
import type { Devotee, DevoteeFamily, Gender, MaritalStatus, RelationshipCode, SupportedLanguage } from "@/types/db";

interface DevoteeFamilyRow {
  id: string;
  tenant_id: string;
  family_name: string;
  primary_devotee_id: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  primary_language: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapFamily(row: DevoteeFamilyRow): DevoteeFamily {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    familyName: row.family_name,
    primaryDevoteeId: row.primary_devotee_id,
    address: row.address,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    primaryLanguage: row.primary_language as SupportedLanguage | null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface FamilyMemberInput {
  displayName: string;
  relationship: RelationshipCode;
  gender?: Gender | null;
  maritalStatus?: MaritalStatus | null;
  dateOfBirth?: string | null;
  weddingAnniversary?: string | null;
  birthStar?: string | null;
  ancestralLineage?: string | null;
  whatsappPhone?: string | null;
}

export interface CreateFamilyInput {
  familyName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  primaryLanguage?: SupportedLanguage | null;
  members: FamilyMemberInput[];
}

export interface UpdateFamilyMemberInput extends FamilyMemberInput {
  /** An existing member's devotee id — omitted means "add this as a new member." */
  id?: string;
}

export interface UpdateFamilyInput {
  familyName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  primaryLanguage?: SupportedLanguage | null;
  members: UpdateFamilyMemberInput[];
}

export interface FamilyWithMembers {
  family: DevoteeFamily;
  members: (Devotee & { isPrimary: boolean })[];
}

export async function getFamilyById(tenantId: string, familyId: string): Promise<DevoteeFamily | null> {
  const { rows } = await getPool().query<DevoteeFamilyRow>(
    "SELECT * FROM devotee_families WHERE tenant_id = $1 AND id = $2",
    [tenantId, familyId],
  );
  return rows[0] ? mapFamily(rows[0]) : null;
}

/** Used by the family-aware import commit to decide "new family" vs "append to existing." */
export async function getFamilyByName(tenantId: string, familyName: string): Promise<DevoteeFamily | null> {
  const { rows } = await getPool().query<DevoteeFamilyRow>(
    "SELECT * FROM devotee_families WHERE tenant_id = $1 AND lower(family_name) = lower($2)",
    [tenantId, familyName],
  );
  return rows[0] ? mapFamily(rows[0]) : null;
}

/**
 * Family sizes are small (a handful of members), so resolving each member
 * via the existing getDevoteeById (N+1) is simpler and safer than
 * duplicating devotees.ts's row-mapping logic here — not a hot path.
 */
export async function getFamilyWithMembers(tenantId: string, familyId: string): Promise<FamilyWithMembers | null> {
  const family = await getFamilyById(tenantId, familyId);
  if (!family) return null;

  const { rows } = await getPool().query<{ devotee_id: string; is_primary: boolean }>(
    "SELECT devotee_id, is_primary FROM family_members WHERE family_id = $1 ORDER BY is_primary DESC",
    [familyId],
  );
  const resolved = await Promise.all(
    rows.map(async (row) => {
      const devotee = await getDevoteeById(tenantId, row.devotee_id);
      return devotee ? { ...devotee, isPrimary: row.is_primary } : null;
    }),
  );
  const members = resolved.filter((m): m is Devotee & { isPrimary: boolean } => m !== null);
  return { family, members };
}

/** For the devotee edit dialog's family-reassignment dropdown. */
export async function listFamiliesForTenant(tenantId: string): Promise<DevoteeFamily[]> {
  const { rows } = await getPool().query<DevoteeFamilyRow>(
    "SELECT * FROM devotee_families WHERE tenant_id = $1 ORDER BY family_name ASC",
    [tenantId],
  );
  return rows.map(mapFamily);
}

export async function countFamilies(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM devotee_families WHERE tenant_id = $1",
    [tenantId],
  );
  return Number(rows[0].count);
}

/**
 * devotee_families → family_members is ON DELETE CASCADE (unlinks all
 * members) and devotees.family_id is ON DELETE SET NULL — every member's
 * own devotee row survives as a standalone individual.
 */
export async function deleteFamily(tenantId: string, familyId: string): Promise<boolean> {
  const result = await getPool().query(
    "DELETE FROM devotee_families WHERE tenant_id = $1 AND id = $2",
    [tenantId, familyId],
  );
  return (result.rowCount ?? 0) > 0;
}

/** Creates the family, one devotees row per member, and links them all in a single transaction. */
export async function createFamilyWithMembers(
  tenantId: string,
  input: CreateFamilyInput,
): Promise<FamilyWithMembers> {
  const headCount = input.members.filter((m) => m.relationship === "head_of_family").length;
  if (headCount !== 1) {
    throw new Error("A family must have exactly one Head of Family.");
  }

  const client = await getPool().connect();
  let familyId: string;
  try {
    await client.query("BEGIN");

    const familyResult = await client.query<{ id: string }>(
      `INSERT INTO devotee_families (tenant_id, family_name, address, city, state, pincode, primary_language)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        tenantId,
        input.familyName,
        input.address ?? null,
        input.city ?? null,
        input.state ?? null,
        input.pincode ?? null,
        input.primaryLanguage ?? null,
      ],
    );
    familyId = familyResult.rows[0].id;

    let primaryDevoteeId: string | null = null;
    for (const member of input.members) {
      const devoteeResult = await client.query<{ id: string }>(
        `INSERT INTO devotees
           (tenant_id, whatsapp_phone, display_name, date_of_birth, birth_star, ancestral_lineage, whatsapp_opt_in_status, gender, marital_status, wedding_anniversary, family_id)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $9, $10)
         RETURNING id`,
        [
          tenantId,
          member.whatsappPhone ?? null,
          member.displayName,
          member.dateOfBirth ?? null,
          member.birthStar ?? null,
          member.ancestralLineage ?? null,
          member.gender ?? null,
          member.maritalStatus ?? null,
          member.weddingAnniversary ?? null,
          familyId,
        ],
      );
      const devoteeId = devoteeResult.rows[0].id;
      const isPrimary = member.relationship === "head_of_family";
      await client.query(
        `INSERT INTO family_members (family_id, devotee_id, relationship, is_primary) VALUES ($1, $2, $3, $4)`,
        [familyId, devoteeId, member.relationship, isPrimary],
      );
      if (isPrimary) primaryDevoteeId = devoteeId;
    }

    await client.query(
      "UPDATE devotee_families SET primary_devotee_id = $2, updated_at = now() WHERE id = $1",
      [familyId, primaryDevoteeId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return (await getFamilyWithMembers(tenantId, familyId))!;
}

/**
 * Reconciles the full members array against the current state in one call:
 * payload members with an `id` are updated in place, members with no `id`
 * are inserted as new devotees, and existing members absent from the
 * payload are unlinked (family_id set NULL, family_members row removed) —
 * never deleted, so their own donation/WhatsApp history is preserved.
 */
export async function updateFamilyWithMembers(
  tenantId: string,
  familyId: string,
  input: UpdateFamilyInput,
): Promise<FamilyWithMembers | null> {
  const existing = await getFamilyById(tenantId, familyId);
  if (!existing) return null;

  const headCount = input.members.filter((m) => m.relationship === "head_of_family").length;
  if (headCount !== 1) {
    throw new Error("A family must have exactly one Head of Family.");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `UPDATE devotee_families
       SET family_name = $2, address = $3, city = $4, state = $5, pincode = $6, primary_language = $7, updated_at = now()
       WHERE id = $1`,
      [
        familyId,
        input.familyName,
        input.address ?? null,
        input.city ?? null,
        input.state ?? null,
        input.pincode ?? null,
        input.primaryLanguage ?? null,
      ],
    );

    const { rows: currentMemberRows } = await client.query<{ devotee_id: string }>(
      "SELECT devotee_id FROM family_members WHERE family_id = $1",
      [familyId],
    );
    const keepIds = new Set(input.members.filter((m) => m.id).map((m) => m.id!));
    for (const { devotee_id: devoteeId } of currentMemberRows) {
      if (!keepIds.has(devoteeId)) {
        await client.query("DELETE FROM family_members WHERE family_id = $1 AND devotee_id = $2", [
          familyId,
          devoteeId,
        ]);
        await client.query("UPDATE devotees SET family_id = NULL, updated_at = now() WHERE id = $1", [
          devoteeId,
        ]);
      }
    }

    let primaryDevoteeId: string | null = null;
    for (const member of input.members) {
      const isPrimary = member.relationship === "head_of_family";
      if (member.id) {
        await client.query(
          `UPDATE devotees
           SET display_name = $3, whatsapp_phone = $4, date_of_birth = $5, birth_star = $6,
               ancestral_lineage = $7, gender = $8, marital_status = $9, wedding_anniversary = $10, updated_at = now()
           WHERE id = $1 AND tenant_id = $2`,
          [
            member.id,
            tenantId,
            member.displayName,
            member.whatsappPhone ?? null,
            member.dateOfBirth ?? null,
            member.birthStar ?? null,
            member.gender ?? null,
            member.maritalStatus ?? null,
            member.weddingAnniversary ?? null,
          ],
        );
        await client.query(
          "UPDATE family_members SET relationship = $3, is_primary = $4 WHERE family_id = $1 AND devotee_id = $2",
          [familyId, member.id, member.relationship, isPrimary],
        );
        if (isPrimary) primaryDevoteeId = member.id;
      } else {
        const devoteeResult = await client.query<{ id: string }>(
          `INSERT INTO devotees
             (tenant_id, whatsapp_phone, display_name, date_of_birth, birth_star, ancestral_lineage, whatsapp_opt_in_status, gender, marital_status, wedding_anniversary, family_id)
           VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $9, $10)
           RETURNING id`,
          [
            tenantId,
            member.whatsappPhone ?? null,
            member.displayName,
            member.dateOfBirth ?? null,
            member.birthStar ?? null,
            member.ancestralLineage ?? null,
            member.gender ?? null,
            member.maritalStatus ?? null,
            member.weddingAnniversary ?? null,
            familyId,
          ],
        );
        const newId = devoteeResult.rows[0].id;
        await client.query(
          "INSERT INTO family_members (family_id, devotee_id, relationship, is_primary) VALUES ($1, $2, $3, $4)",
          [familyId, newId, member.relationship, isPrimary],
        );
        if (isPrimary) primaryDevoteeId = newId;
      }
    }

    await client.query(
      "UPDATE devotee_families SET primary_devotee_id = $2, updated_at = now() WHERE id = $1",
      [familyId, primaryDevoteeId],
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getFamilyWithMembers(tenantId, familyId);
}

/**
 * Import-commit helper: appends new members to an already-existing family
 * (e.g. a second CSV upload extending a previously-imported household).
 * Rejects a row claiming `head_of_family` if the family already has a
 * primary devotee, keeping "exactly one head" true across separate imports.
 */
export async function addMembersToFamily(
  tenantId: string,
  familyId: string,
  members: FamilyMemberInput[],
): Promise<FamilyWithMembers | null> {
  const family = await getFamilyById(tenantId, familyId);
  if (!family) return null;

  if (family.primaryDevoteeId && members.some((m) => m.relationship === "head_of_family")) {
    throw new Error("This family already has a Head of Family.");
  }

  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    let primaryDevoteeId = family.primaryDevoteeId;
    for (const member of members) {
      const devoteeResult = await client.query<{ id: string }>(
        `INSERT INTO devotees
           (tenant_id, whatsapp_phone, display_name, date_of_birth, birth_star, ancestral_lineage, whatsapp_opt_in_status, gender, marital_status, wedding_anniversary, family_id)
         VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $9, $10)
         RETURNING id`,
        [
          tenantId,
          member.whatsappPhone ?? null,
          member.displayName,
          member.dateOfBirth ?? null,
          member.birthStar ?? null,
          member.ancestralLineage ?? null,
          member.gender ?? null,
          member.maritalStatus ?? null,
          member.weddingAnniversary ?? null,
          familyId,
        ],
      );
      const devoteeId = devoteeResult.rows[0].id;
      const isPrimary = member.relationship === "head_of_family";
      await client.query(
        "INSERT INTO family_members (family_id, devotee_id, relationship, is_primary) VALUES ($1, $2, $3, $4)",
        [familyId, devoteeId, member.relationship, isPrimary],
      );
      if (isPrimary) primaryDevoteeId = devoteeId;
    }
    if (primaryDevoteeId !== family.primaryDevoteeId) {
      await client.query("UPDATE devotee_families SET primary_devotee_id = $2, updated_at = now() WHERE id = $1", [
        familyId,
        primaryDevoteeId,
      ]);
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  return getFamilyWithMembers(tenantId, familyId);
}
