import { getPool } from "./pool";
import type { Devotee, Gender, MaritalStatus, RelationshipCode, SupportedLanguage } from "@/types/db";
import { DEFAULT_PAGE_SIZE, computeOffset } from "@/lib/pagination";

interface DevoteeRow {
  id: string;
  tenant_id: string;
  whatsapp_phone: string | null;
  display_name: string;
  date_of_birth: string | null;
  birth_star: string | null;
  ancestral_lineage: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
  last_interaction_type: string | null;
  whatsapp_opt_in_status: boolean;
  preferred_language: string | null;
  is_donor: boolean;
  total_donated_amount: string;
  last_donation_at: Date | null;
  event_notifications_enabled: boolean;
  family_id: string | null;
  gender: string | null;
  marital_status: string | null;
  wedding_anniversary: string | null;
  family_name: string | null;
  relationship: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapDevotee(row: DevoteeRow): Devotee {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    whatsappPhone: row.whatsapp_phone,
    displayName: row.display_name,
    dateOfBirth: row.date_of_birth,
    birthStar: row.birth_star,
    ancestralLineage: row.ancestral_lineage,
    firstSeenAt: row.first_seen_at.toISOString(),
    lastSeenAt: row.last_seen_at.toISOString(),
    lastInteractionType: row.last_interaction_type,
    whatsappOptInStatus: row.whatsapp_opt_in_status,
    preferredLanguage: row.preferred_language as SupportedLanguage | null,
    isDonor: row.is_donor,
    totalDonatedAmount: row.total_donated_amount,
    lastDonationAt: row.last_donation_at ? row.last_donation_at.toISOString() : null,
    eventNotificationsEnabled: row.event_notifications_enabled,
    familyId: row.family_id,
    gender: row.gender as Gender | null,
    maritalStatus: row.marital_status as MaritalStatus | null,
    weddingAnniversary: row.wedding_anniversary,
    familyName: row.family_name,
    relationship: row.relationship as RelationshipCode | null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/**
 * Every read joins devotee_families/family_members so `Devotee.familyName`/
 * `relationship` are always populated — a devotee has at most one
 * family_members row (UNIQUE(family_id, devotee_id) with family_id fixed per
 * devotee), so this is a 1:1 join and never duplicates rows.
 */
const DEVOTEE_SELECT = `
  SELECT d.*, df.family_name AS family_name, fm.relationship AS relationship
  FROM devotees d
  LEFT JOIN devotee_families df ON df.id = d.family_id
  LEFT JOIN family_members fm ON fm.family_id = d.family_id AND fm.devotee_id = d.id
`;

/** `EXTRACT(MONTH/DAY FROM column) = EXTRACT(MONTH/DAY FROM tenant-local now)`. */
function occasionTodayCondition(column: string, tzParamIndex: number): string {
  return `(EXTRACT(MONTH FROM ${column}) = EXTRACT(MONTH FROM (now() AT TIME ZONE $${tzParamIndex}))
    AND EXTRACT(DAY FROM ${column}) = EXTRACT(DAY FROM (now() AT TIME ZONE $${tzParamIndex})))`;
}

/**
 * "This year's" and "next year's" occurrence of `column`'s month/day,
 * checked against [today, today+6] in the tenant's timezone. Using each
 * date's own day-offset-from-Jan-1 (rather than EXTRACT+make_date on the
 * target year directly) means a Feb 29 birthday never crashes on a
 * non-leap target year — it just rolls onto Mar 1, a common convention.
 */
function occasionThisWeekCondition(column: string, tzParamIndex: number): string {
  const dayOffset = `(${column} - make_date(EXTRACT(YEAR FROM ${column})::int, 1, 1))`;
  const todayDate = `date_trunc('day', now() AT TIME ZONE $${tzParamIndex})::date`;
  const thisYear = `EXTRACT(YEAR FROM (now() AT TIME ZONE $${tzParamIndex}))::int`;
  return `(
    (make_date(${thisYear}, 1, 1) + ${dayOffset}) BETWEEN ${todayDate} AND ${todayDate} + 6
    OR (make_date(${thisYear} + 1, 1, 1) + ${dayOffset}) BETWEEN ${todayDate} AND ${todayDate} + 6
  )`;
}

export interface ListDevoteesOptions {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: "name" | "phone" | "firstSeen";
  dir?: "asc" | "desc";
  registrationType?: "individual" | "family";
  isDonor?: boolean;
  whatsappOptIn?: boolean;
  /** "_week" variants need `timezone` set — silently ignored otherwise. */
  occasion?: "birthday_today" | "birthday_week" | "anniversary_today" | "anniversary_week";
  timezone?: string;
}

const DEVOTEE_SORT_COLUMNS: Record<NonNullable<ListDevoteesOptions["sort"]>, string> = {
  name: "d.display_name",
  phone: "d.whatsapp_phone",
  firstSeen: "d.first_seen_at",
};

type DevoteeFilterOptions = Omit<ListDevoteesOptions, "page" | "pageSize" | "sort" | "dir">;

function buildDevoteeConditions(opts: DevoteeFilterOptions = {}): { conditions: string[]; params: unknown[] } {
  const conditions = ["d.tenant_id = $1"];
  const params: unknown[] = [];

  if (opts.search && opts.search.trim()) {
    params.push(`%${opts.search.trim()}%`);
    const idx = params.length + 1;
    conditions.push(
      `(d.display_name ILIKE $${idx} OR d.whatsapp_phone ILIKE $${idx} OR d.birth_star ILIKE $${idx} OR d.ancestral_lineage ILIKE $${idx} OR df.family_name ILIKE $${idx})`,
    );
  }
  if (opts.registrationType === "individual") conditions.push("d.family_id IS NULL");
  if (opts.registrationType === "family") conditions.push("d.family_id IS NOT NULL");
  if (opts.isDonor !== undefined) {
    params.push(opts.isDonor);
    conditions.push(`d.is_donor = $${params.length + 1}`);
  }
  if (opts.whatsappOptIn !== undefined) {
    params.push(opts.whatsappOptIn);
    conditions.push(`d.whatsapp_opt_in_status = $${params.length + 1}`);
  }
  if (opts.occasion && opts.timezone) {
    params.push(opts.timezone);
    const tzIdx = params.length + 1;
    if (opts.occasion === "birthday_today") conditions.push(occasionTodayCondition("d.date_of_birth", tzIdx));
    if (opts.occasion === "anniversary_today") conditions.push(occasionTodayCondition("d.wedding_anniversary", tzIdx));
    if (opts.occasion === "birthday_week") conditions.push(occasionThisWeekCondition("d.date_of_birth", tzIdx));
    if (opts.occasion === "anniversary_week") conditions.push(occasionThisWeekCondition("d.wedding_anniversary", tzIdx));
  }
  return { conditions, params };
}

/** `page`/`pageSize` are optional — omitted, this returns the full unpaginated result (existing callers rely on this). */
export async function listDevotees(tenantId: string, opts: ListDevoteesOptions = {}): Promise<Devotee[]> {
  const { conditions, params: filterParams } = buildDevoteeConditions(opts);
  const params: unknown[] = [tenantId, ...filterParams];

  const sortColumn = opts.sort ? DEVOTEE_SORT_COLUMNS[opts.sort] : "d.display_name";
  const dir = opts.dir === "desc" ? "DESC" : "ASC";

  let query = `${DEVOTEE_SELECT} WHERE ${conditions.join(" AND ")} ORDER BY ${sortColumn} ${dir}`;

  if (opts.page !== undefined) {
    const pageSize = opts.pageSize ?? DEFAULT_PAGE_SIZE;
    params.push(pageSize, computeOffset(opts.page, pageSize));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const { rows } = await getPool().query<DevoteeRow>(query, params);
  return rows.map(mapDevotee);
}

export async function countDevoteesFiltered(tenantId: string, opts: DevoteeFilterOptions = {}): Promise<number> {
  const { conditions, params: filterParams } = buildDevoteeConditions(opts);
  const params: unknown[] = [tenantId, ...filterParams];
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM devotees d
     LEFT JOIN devotee_families df ON df.id = d.family_id
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.count ?? 0);
}

/** "Export Selected" — fetch exactly the rows an admin picked in the table. */
export async function listDevoteesByIds(tenantId: string, ids: string[]): Promise<Devotee[]> {
  if (ids.length === 0) return [];
  const { rows } = await getPool().query<DevoteeRow>(
    `${DEVOTEE_SELECT} WHERE d.tenant_id = $1 AND d.id = ANY($2::uuid[]) ORDER BY d.display_name ASC`,
    [tenantId, ids],
  );
  return rows.map(mapDevotee);
}

/** Devotee import — checks a batch of normalized phone numbers against existing devotees in one query. */
export async function listExistingPhones(tenantId: string, phones: string[]): Promise<Set<string>> {
  if (phones.length === 0) return new Set();
  const { rows } = await getPool().query<{ whatsapp_phone: string }>(
    "SELECT whatsapp_phone FROM devotees WHERE tenant_id = $1 AND whatsapp_phone = ANY($2::text[])",
    [tenantId, phones],
  );
  return new Set(rows.map((r) => r.whatsapp_phone));
}

/** Dashboard "Recent Devotees" widget. */
export async function listRecentDevotees(tenantId: string, limit = 5): Promise<Devotee[]> {
  const { rows } = await getPool().query<DevoteeRow>(
    `${DEVOTEE_SELECT} WHERE d.tenant_id = $1 ORDER BY d.first_seen_at DESC LIMIT $2`,
    [tenantId, limit],
  );
  return rows.map(mapDevotee);
}

/** Recipients for the event-reminder cron — same eligibility rule lib/db/event-announcements.ts uses for automatic (non-manual) event announcements. */
export async function listDevoteesEligibleForEventReminders(tenantId: string): Promise<Devotee[]> {
  const { rows } = await getPool().query<DevoteeRow>(
    `${DEVOTEE_SELECT}
     WHERE d.tenant_id = $1 AND d.whatsapp_opt_in_status = true AND d.event_notifications_enabled = true
     ORDER BY d.display_name ASC`,
    [tenantId],
  );
  return rows.map(mapDevotee);
}

/**
 * Used by app/api/cron/daily-birthday-check/route.ts. "Today" is computed in
 * the tenant's own timezone, not server UTC. Dedups against notifications
 * already created today so a cron re-run (or a delayed run) never
 * double-sends the same devotee's birthday wish.
 */
export async function listDevoteesWithBirthdayToday(tenantId: string, timezone: string): Promise<Devotee[]> {
  const { rows } = await getPool().query<DevoteeRow>(
    `${DEVOTEE_SELECT}
     WHERE d.tenant_id = $1
       AND d.whatsapp_opt_in_status = true
       AND d.date_of_birth IS NOT NULL
       AND ${occasionTodayCondition("d.date_of_birth", 2)}
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.recipient_devotee_id = d.id
           AND n.notification_type = 'birthday_devotee'
           AND n.created_at >= (date_trunc('day', now() AT TIME ZONE $2) AT TIME ZONE $2)
       )`,
    [tenantId, timezone],
  );
  return rows.map(mapDevotee);
}

/** Anniversary counterpart of listDevoteesWithBirthdayToday — identical shape, on wedding_anniversary. */
export async function listDevoteesWithAnniversaryToday(tenantId: string, timezone: string): Promise<Devotee[]> {
  const { rows } = await getPool().query<DevoteeRow>(
    `${DEVOTEE_SELECT}
     WHERE d.tenant_id = $1
       AND d.whatsapp_opt_in_status = true
       AND d.wedding_anniversary IS NOT NULL
       AND ${occasionTodayCondition("d.wedding_anniversary", 2)}
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.recipient_devotee_id = d.id
           AND n.notification_type = 'anniversary_devotee'
           AND n.created_at >= (date_trunc('day', now() AT TIME ZONE $2) AT TIME ZONE $2)
       )`,
    [tenantId, timezone],
  );
  return rows.map(mapDevotee);
}

export interface FamilyOccasionReminder {
  familyId: string;
  primaryDevoteeId: string;
  primaryLanguage: SupportedLanguage | null;
  occasions: { name: string; kind: "birthday" | "anniversary" }[];
}

/**
 * Groups tomorrow's birthdays/anniversaries (tenant-local) by family, for
 * app/api/cron/daily-birthday-check/route.ts's family-head reminder. Only
 * families with a primary_devotee_id are eligible (nothing to notify
 * otherwise); deduped per family per day the same way as the devotee-level
 * checks above.
 */
export async function listFamilyOccasionRemindersDueTomorrow(
  tenantId: string,
  timezone: string,
): Promise<FamilyOccasionReminder[]> {
  const { rows } = await getPool().query<{
    family_id: string;
    primary_devotee_id: string;
    primary_language: string | null;
    occasions: { name: string; kind: "birthday" | "anniversary" }[];
  }>(
    `WITH tomorrow_occasions AS (
       SELECT d.family_id, d.display_name AS name, 'birthday' AS kind
       FROM devotees d
       WHERE d.tenant_id = $1 AND d.family_id IS NOT NULL AND d.date_of_birth IS NOT NULL
         AND EXTRACT(MONTH FROM d.date_of_birth) = EXTRACT(MONTH FROM ((now() AT TIME ZONE $2) + interval '1 day'))
         AND EXTRACT(DAY FROM d.date_of_birth) = EXTRACT(DAY FROM ((now() AT TIME ZONE $2) + interval '1 day'))
       UNION ALL
       SELECT d.family_id, d.display_name, 'anniversary'
       FROM devotees d
       WHERE d.tenant_id = $1 AND d.family_id IS NOT NULL AND d.wedding_anniversary IS NOT NULL
         AND EXTRACT(MONTH FROM d.wedding_anniversary) = EXTRACT(MONTH FROM ((now() AT TIME ZONE $2) + interval '1 day'))
         AND EXTRACT(DAY FROM d.wedding_anniversary) = EXTRACT(DAY FROM ((now() AT TIME ZONE $2) + interval '1 day'))
     )
     SELECT df.id AS family_id, df.primary_devotee_id, pd.preferred_language AS primary_language,
            jsonb_agg(jsonb_build_object('name', t.name, 'kind', t.kind) ORDER BY t.kind, t.name) AS occasions
     FROM tomorrow_occasions t
     JOIN devotee_families df ON df.id = t.family_id
     JOIN devotees pd ON pd.id = df.primary_devotee_id
     WHERE df.primary_devotee_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.recipient_devotee_id = df.primary_devotee_id
           AND n.notification_type = 'family_occasion_reminder'
           AND n.created_at >= (date_trunc('day', now() AT TIME ZONE $2) AT TIME ZONE $2)
       )
     GROUP BY df.id, df.primary_devotee_id, pd.preferred_language`,
    [tenantId, timezone],
  );
  return rows.map((row) => ({
    familyId: row.family_id,
    primaryDevoteeId: row.primary_devotee_id,
    primaryLanguage: row.primary_language as SupportedLanguage | null,
    occasions: row.occasions,
  }));
}

export async function getDevoteeById(tenantId: string, devoteeId: string): Promise<Devotee | null> {
  const { rows } = await getPool().query<DevoteeRow>(
    `${DEVOTEE_SELECT} WHERE d.tenant_id = $1 AND d.id = $2`,
    [tenantId, devoteeId],
  );
  return rows[0] ? mapDevotee(rows[0]) : null;
}

export async function getDevoteeByPhone(
  tenantId: string,
  whatsappPhone: string,
): Promise<Devotee | null> {
  const { rows } = await getPool().query<DevoteeRow>(
    `${DEVOTEE_SELECT} WHERE d.tenant_id = $1 AND d.whatsapp_phone = $2`,
    [tenantId, whatsappPhone],
  );
  return rows[0] ? mapDevotee(rows[0]) : null;
}

export interface CreateDevoteeInput {
  whatsappPhone: string | null;
  displayName: string;
  dateOfBirth: string | null;
  birthStar: string | null;
  ancestralLineage: string | null;
  gender?: Gender | null;
  maritalStatus?: MaritalStatus | null;
  weddingAnniversary?: string | null;
  /** Only ever set by lib/db/devotee-families.ts — never from the plain individual-devotee create path. */
  familyId?: string | null;
}

/**
 * Manually added devotees default to not opted in until they message the
 * temple number. `family_name`/`relationship` are returned as literal NULLs
 * here rather than re-querying — accurate for every caller: the plain
 * individual-create path never sets familyId, and lib/db/devotee-families.ts
 * (the only caller that does) builds its own richer result instead of
 * relying on this return value.
 */
export async function createDevotee(
  tenantId: string,
  input: CreateDevoteeInput,
): Promise<Devotee> {
  const { rows } = await getPool().query<DevoteeRow>(
    `INSERT INTO devotees
       (tenant_id, whatsapp_phone, display_name, date_of_birth, birth_star, ancestral_lineage, whatsapp_opt_in_status, gender, marital_status, wedding_anniversary, family_id)
     VALUES ($1, $2, $3, $4, $5, $6, false, $7, $8, $9, $10)
     RETURNING *, NULL::text AS family_name, NULL::text AS relationship`,
    [
      tenantId,
      input.whatsappPhone,
      input.displayName,
      input.dateOfBirth,
      input.birthStar,
      input.ancestralLineage,
      input.gender ?? null,
      input.maritalStatus ?? null,
      input.weddingAnniversary ?? null,
      input.familyId ?? null,
    ],
  );
  return mapDevotee(rows[0]);
}

export interface UpsertDevoteeFromWhatsAppInput {
  whatsappPhone: string;
  displayName: string;
  lastInteractionType: string;
}

/**
 * Called from the inbound WhatsApp webhook. Auto-creates a new devotee opted
 * in, or reuses an existing one, refreshing last-seen/interaction without
 * touching a display name an admin may have already edited. Never touches
 * family_id — a devotee created this way starts with no family, always.
 */
export async function upsertDevoteeFromWhatsApp(
  tenantId: string,
  input: UpsertDevoteeFromWhatsAppInput,
): Promise<Devotee> {
  const { rows } = await getPool().query<DevoteeRow>(
    `INSERT INTO devotees
       (tenant_id, whatsapp_phone, display_name, whatsapp_opt_in_status, last_interaction_type, first_seen_at, last_seen_at)
     VALUES ($1, $2, $3, true, $4, now(), now())
     ON CONFLICT (tenant_id, whatsapp_phone)
     DO UPDATE SET
       whatsapp_opt_in_status = true,
       last_interaction_type = EXCLUDED.last_interaction_type,
       last_seen_at = now(),
       updated_at = now()
     RETURNING *`,
    [tenantId, input.whatsappPhone, input.displayName, input.lastInteractionType],
  );
  return await getDevoteeById(tenantId, rows[0].id) as Devotee;
}

/**
 * Called only from the WhatsApp bot's language picker — a plain, unambiguous
 * write (always a concrete non-null value), so it bypasses the generic
 * updateDevotee()/UpdateDevoteeInput CASE-WHEN machinery built for the admin
 * dashboard's ambiguous partial-update case (was a field provided at all?).
 */
export async function updateDevoteePreferredLanguage(
  tenantId: string,
  devoteeId: string,
  language: SupportedLanguage,
): Promise<Devotee | null> {
  const { rows } = await getPool().query<{ id: string }>(
    `UPDATE devotees SET preferred_language = $3, updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING id`,
    [tenantId, devoteeId, language],
  );
  return rows[0] ? getDevoteeById(tenantId, rows[0].id) : null;
}

export interface UpdateDevoteeInput {
  whatsappPhone?: string | null;
  displayName?: string;
  dateOfBirth?: string | null;
  birthStar?: string | null;
  ancestralLineage?: string | null;
  eventNotificationsEnabled?: boolean;
  gender?: Gender | null;
  maritalStatus?: MaritalStatus | null;
  weddingAnniversary?: string | null;
}

export async function updateDevotee(
  tenantId: string,
  devoteeId: string,
  input: UpdateDevoteeInput,
): Promise<Devotee | null> {
  const { rows } = await getPool().query<{ id: string }>(
    `UPDATE devotees
     SET whatsapp_phone = CASE WHEN $3::boolean THEN $4 ELSE whatsapp_phone END,
         display_name = COALESCE($5, display_name),
         date_of_birth = CASE WHEN $6::boolean THEN $7 ELSE date_of_birth END,
         birth_star = CASE WHEN $8::boolean THEN $9 ELSE birth_star END,
         ancestral_lineage = CASE WHEN $10::boolean THEN $11 ELSE ancestral_lineage END,
         event_notifications_enabled = COALESCE($12::boolean, event_notifications_enabled),
         gender = CASE WHEN $13::boolean THEN $14 ELSE gender END,
         marital_status = CASE WHEN $15::boolean THEN $16 ELSE marital_status END,
         wedding_anniversary = CASE WHEN $17::boolean THEN $18 ELSE wedding_anniversary END,
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING id`,
    [
      tenantId,
      devoteeId,
      "whatsappPhone" in input,
      input.whatsappPhone ?? null,
      input.displayName ?? null,
      "dateOfBirth" in input,
      input.dateOfBirth ?? null,
      "birthStar" in input,
      input.birthStar ?? null,
      "ancestralLineage" in input,
      input.ancestralLineage ?? null,
      input.eventNotificationsEnabled ?? null,
      "gender" in input,
      input.gender ?? null,
      "maritalStatus" in input,
      input.maritalStatus ?? null,
      "weddingAnniversary" in input,
      input.weddingAnniversary ?? null,
    ],
  );
  return rows[0] ? getDevoteeById(tenantId, rows[0].id) : null;
}

/**
 * WhatsApp message/interaction history rows referencing this devotee are
 * kept (their devotee_id column is nullable and ON DELETE SET NULL) — only
 * the devotee record itself is removed. Donation history has no such
 * fallback (devotee_id there is required, no ON DELETE action), so deleting
 * a devotee with donations fails with a foreign key violation; the caller
 * (the API route) turns that into a friendly 409.
 */
export async function deleteDevotee(tenantId: string, devoteeId: string): Promise<boolean> {
  const result = await getPool().query("DELETE FROM devotees WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    devoteeId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function countDevotees(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM devotees WHERE tenant_id = $1",
    [tenantId],
  );
  return Number(rows[0].count);
}

export async function countOptedInDevotees(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM devotees WHERE tenant_id = $1 AND whatsapp_opt_in_status = true",
    [tenantId],
  );
  return Number(rows[0].count);
}

export async function countIndividualDevotees(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM devotees WHERE tenant_id = $1 AND family_id IS NULL",
    [tenantId],
  );
  return Number(rows[0].count);
}

export async function countBirthdaysThisWeek(tenantId: string, timezone: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM devotees d
     WHERE d.tenant_id = $1 AND d.date_of_birth IS NOT NULL AND ${occasionThisWeekCondition("d.date_of_birth", 2)}`,
    [tenantId, timezone],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function countAnniversariesThisWeek(tenantId: string, timezone: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM devotees d
     WHERE d.tenant_id = $1 AND d.wedding_anniversary IS NOT NULL AND ${occasionThisWeekCondition("d.wedding_anniversary", 2)}`,
    [tenantId, timezone],
  );
  return Number(rows[0]?.count ?? 0);
}
