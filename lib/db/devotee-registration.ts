import { getPool } from "./pool";
import { normalizePhoneNumber } from "@/lib/phone.mts";
import type { DevoteeRegistrationPayload } from "@/lib/validation/devotee-registration";
import type { PoolClient } from "pg";

export class DevoteeRegistrationValidationError extends Error {}
export class DevoteeFamilyMoveConflictError extends Error {
  constructor(
    message: string,
    readonly devoteeId: string,
    readonly currentFamilyId: string,
  ) {
    super(message);
  }
}

export interface DevoteeRegistrationResult {
  devoteeId: string;
  familyId: string | null;
}

type DbClient = PoolClient;

interface ExistingFamilyRow {
  id: string;
  primary_devotee_id: string | null;
}

interface ExistingDevoteeRow {
  id: string;
  family_id: string | null;
}

function normalizeRequiredPhone(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    throw new DevoteeRegistrationValidationError("Enter a valid phone number");
  }
  return normalized;
}

function normalizeOptionalPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    throw new DevoteeRegistrationValidationError("Enter a valid family member phone number");
  }
  return normalized;
}

async function insertDevotee(
  client: DbClient,
  tenantId: string,
  input: DevoteeRegistrationPayload["devotee"] | Extract<
    Extract<DevoteeRegistrationPayload["family"], { mode: "new" }>["members"][number],
    { kind: "new" }
  >,
  familyId: string | null,
  whatsappOptInStatus?: boolean,
): Promise<string> {
  const normalizedPhone = "whatsappPhone" in input && input.whatsappPhone
    ? "kind" in input
      ? normalizeOptionalPhone(input.whatsappPhone)
      : normalizeRequiredPhone(input.whatsappPhone)
    : null;
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO devotees
       (tenant_id, whatsapp_phone, display_name, date_of_birth, birth_star, ancestral_lineage, whatsapp_opt_in_status, gender, marital_status, wedding_anniversary, family_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [
      tenantId,
      normalizedPhone,
      input.displayName,
      input.dateOfBirth ?? null,
      input.birthStar ?? null,
      input.ancestralLineage ?? null,
      normalizedPhone !== null && ("kind" in input && input.kind === "new" ? true : (whatsappOptInStatus ?? true)),
      input.gender ?? null,
      input.maritalStatus ?? null,
      input.weddingAnniversary ?? null,
      familyId,
    ],
  );
  return rows[0].id;
}

async function loadFamilyForUpdate(
  client: DbClient,
  tenantId: string,
  familyId: string,
): Promise<ExistingFamilyRow> {
  const { rows } = await client.query<ExistingFamilyRow>(
    "SELECT id, primary_devotee_id FROM devotee_families WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
    [tenantId, familyId],
  );
  if (!rows[0]) {
    throw new DevoteeRegistrationValidationError("Family not found");
  }
  return rows[0];
}

async function attachDevoteeToFamily(
  client: DbClient,
  input: {
    tenantId: string;
    familyId: string;
    devoteeId: string;
    relationship: string;
    isPrimary: boolean;
    moveFromExistingFamily?: boolean;
  },
) {
  const { rows } = await client.query<ExistingDevoteeRow>(
    "SELECT id, family_id FROM devotees WHERE tenant_id = $1 AND id = $2 FOR UPDATE",
    [input.tenantId, input.devoteeId],
  );
  const existing = rows[0];
  if (!existing) {
    throw new DevoteeRegistrationValidationError("Devotee not found");
  }

  if (existing.family_id && existing.family_id !== input.familyId && input.moveFromExistingFamily !== true) {
    throw new DevoteeFamilyMoveConflictError(
      "Confirm moving this devotee from their current family",
      input.devoteeId,
      existing.family_id,
    );
  }

  if (existing.family_id && existing.family_id !== input.familyId) {
    await client.query("DELETE FROM family_members WHERE devotee_id = $1", [input.devoteeId]);
    await client.query(
      `UPDATE devotee_families
       SET primary_devotee_id = NULL, updated_at = now()
       WHERE id = $1 AND primary_devotee_id = $2`,
      [existing.family_id, input.devoteeId],
    );
  }

  await client.query("UPDATE devotees SET family_id = $2, updated_at = now() WHERE id = $1 AND tenant_id = $3", [
    input.devoteeId,
    input.familyId,
    input.tenantId,
  ]);
  await client.query(
    `INSERT INTO family_members (family_id, devotee_id, relationship, is_primary)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (family_id, devotee_id)
     DO UPDATE SET relationship = EXCLUDED.relationship, is_primary = EXCLUDED.is_primary`,
    [input.familyId, input.devoteeId, input.relationship, input.isPrimary],
  );
}

function assertExactlyOneHead(relationships: string[]) {
  if (relationships.filter((relationship) => relationship === "head_of_family").length !== 1) {
    throw new DevoteeRegistrationValidationError("A family must have exactly one Head of Family");
  }
}

export async function registerDevoteeWithFamilyIntent(
  tenantId: string,
  input: DevoteeRegistrationPayload,
): Promise<DevoteeRegistrationResult> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    if (input.family.mode === "none") {
      const devoteeId = await insertDevotee(
        client,
        tenantId,
        input.devotee,
        null,
        input.devotee.whatsappOptInStatus,
      );
      await client.query("COMMIT");
      return { devoteeId, familyId: null };
    }

    if (input.family.mode === "existing") {
      const family = await loadFamilyForUpdate(client, tenantId, input.family.familyId);
      if (input.family.relationship === "head_of_family" && family.primary_devotee_id) {
        throw new DevoteeRegistrationValidationError("This family already has a Head of Family");
      }
      const devoteeId = await insertDevotee(
        client,
        tenantId,
        input.devotee,
        family.id,
        input.devotee.whatsappOptInStatus,
      );
      await attachDevoteeToFamily(client, {
        tenantId,
        familyId: family.id,
        devoteeId,
        relationship: input.family.relationship,
        isPrimary: input.family.relationship === "head_of_family",
      });
      if (input.family.relationship === "head_of_family") {
        await client.query("UPDATE devotee_families SET primary_devotee_id = $2, updated_at = now() WHERE id = $1", [
          family.id,
          devoteeId,
        ]);
      }
      await client.query("COMMIT");
      return { devoteeId, familyId: family.id };
    }

    assertExactlyOneHead([input.family.primaryRelationship, ...input.family.members.map((member) => member.relationship)]);
    const { rows: familyRows } = await client.query<{ id: string }>(
      `INSERT INTO devotee_families (tenant_id, family_name, address, city, state, pincode, primary_language)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        tenantId,
        input.family.familyName,
        input.family.address ?? null,
        input.family.city ?? null,
        input.family.state ?? null,
        input.family.pincode ?? null,
        input.family.primaryLanguage ?? null,
      ],
    );
    const familyId = familyRows[0].id;
    const devoteeId = await insertDevotee(
      client,
      tenantId,
      input.devotee,
      familyId,
      input.devotee.whatsappOptInStatus,
    );
    let primaryDevoteeId = input.family.primaryRelationship === "head_of_family" ? devoteeId : null;
    await attachDevoteeToFamily(client, {
      tenantId,
      familyId,
      devoteeId,
      relationship: input.family.primaryRelationship,
      isPrimary: input.family.primaryRelationship === "head_of_family",
    });

    for (const member of input.family.members) {
      const isPrimary = member.relationship === "head_of_family";
      if (member.kind === "new") {
        const memberId = await insertDevotee(client, tenantId, member, familyId);
        await attachDevoteeToFamily(client, {
          tenantId,
          familyId,
          devoteeId: memberId,
          relationship: member.relationship,
          isPrimary,
        });
        if (isPrimary) primaryDevoteeId = memberId;
      } else {
        await attachDevoteeToFamily(client, {
          tenantId,
          familyId,
          devoteeId: member.devoteeId,
          relationship: member.relationship,
          isPrimary,
          moveFromExistingFamily: member.moveFromExistingFamily,
        });
        if (isPrimary) primaryDevoteeId = member.devoteeId;
      }
    }

    await client.query("UPDATE devotee_families SET primary_devotee_id = $2, updated_at = now() WHERE id = $1", [
      familyId,
      primaryDevoteeId,
    ]);
    await client.query("COMMIT");
    return { devoteeId, familyId };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
