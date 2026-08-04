import type { PoolClient } from "pg";
import { getPool } from "./pool";
import { createAuditLogEntry } from "./audit-log";
import type { Donation, DonationSummary, DonationWithDonor, PaymentMethod } from "@/types/db";
import { DEFAULT_PAGE_SIZE, computeOffset } from "@/lib/pagination";

interface DonationRow {
  id: string;
  tenant_id: string;
  devotee_id: string | null;
  amount: string | null;
  purpose: string;
  payment_method: string | null;
  notes: string | null;
  donated_at: Date;
  recorded_by: string | null;
  manual_donor_name: string | null;
  manual_donor_phone: string | null;
  manual_donor_email: string | null;
  manual_donor_address: string | null;
  is_anonymous: boolean;
  item_description: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DonationWithDonorRow extends DonationRow {
  donor_name: string;
  donor_phone: string | null;
}

function mapDonation(row: DonationRow): Donation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    devoteeId: row.devotee_id,
    amount: row.amount,
    purpose: row.purpose,
    paymentMethod: row.payment_method as PaymentMethod | null,
    notes: row.notes,
    donatedAt: row.donated_at.toISOString(),
    recordedBy: row.recorded_by,
    manualDonorName: row.manual_donor_name,
    manualDonorPhone: row.manual_donor_phone,
    manualDonorEmail: row.manual_donor_email,
    manualDonorAddress: row.manual_donor_address,
    isAnonymous: row.is_anonymous,
    itemDescription: row.item_description,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapDonationWithDonor(row: DonationWithDonorRow): DonationWithDonor {
  return { ...mapDonation(row), donorName: row.donor_name, donorPhone: row.donor_phone };
}

/**
 * Recomputes is_donor/total_donated_amount/last_donation_at on the devotee
 * from the donations table (the source of truth), rather than incrementally
 * patching them — avoids drift across edits/deletes. Always called inside
 * the same transaction as the donation write it follows. No-op for manual
 * (non-registered) donors — there's no devotee row to update.
 *
 * Intentional: is_donor and last_donation_at update for non-cash donations too —
 * a material gift (e.g. rice, coconuts) counts as a donation event.
 * SUM(amount) ignores NULLs, so non-cash rows contribute 0 to total_donated_amount.
 */
async function recomputeDevoteeDonationCache(client: PoolClient, devoteeId: string | null): Promise<void> {
  if (!devoteeId) return;
  await client.query(
    `UPDATE devotees SET
       is_donor = EXISTS (SELECT 1 FROM donations WHERE devotee_id = $1),
       total_donated_amount = COALESCE((SELECT SUM(amount) FROM donations WHERE devotee_id = $1), 0),
       last_donation_at = (SELECT MAX(donated_at) FROM donations WHERE devotee_id = $1),
       updated_at = now()
     WHERE id = $1`,
    [devoteeId],
  );
}

/** Present exactly when the donation has no registered devotee — see the CHECK constraint in migrations/024_donation_manual_donor.sql. */
export interface ManualDonorInput {
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  isAnonymous: boolean;
}

export interface CreateDonationInput {
  /** Exactly one of devoteeId / manualDonor must be set. */
  devoteeId: string | null;
  manualDonor: ManualDonorInput | null;
  /** Null for non-cash / in-kind donations. */
  amount: number | null;
  purpose: string;
  /** Null for non-cash / in-kind donations. */
  paymentMethod: PaymentMethod | null;
  /** Description of a material gift (e.g. "5kg rice"). Set only when amount and paymentMethod are null. */
  itemDescription: string | null;
  notes: string | null;
  donatedAt: string;
  recordedBy: string | null;
}

export async function createDonation(tenantId: string, input: CreateDonationInput): Promise<Donation> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<DonationRow>(
      `INSERT INTO donations (
         tenant_id, devotee_id, amount, purpose, payment_method, notes, donated_at, recorded_by,
         manual_donor_name, manual_donor_phone, manual_donor_email, manual_donor_address, is_anonymous,
         item_description
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       RETURNING *`,
      [
        tenantId,
        input.devoteeId,
        input.amount,
        input.purpose,
        input.paymentMethod,
        input.notes,
        input.donatedAt,
        input.recordedBy,
        input.manualDonor?.name ?? null,
        input.manualDonor?.phone ?? null,
        input.manualDonor?.email ?? null,
        input.manualDonor?.address ?? null,
        input.manualDonor?.isAnonymous ?? false,
        input.itemDescription,
      ],
    );
    await recomputeDevoteeDonationCache(client, input.devoteeId);
    await client.query("COMMIT");
    return mapDonation(rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface UpdateDonationInput {
  /** Switches this donation to an existing devotee (clears any manual-donor snapshot). Omit to leave the donor unchanged. */
  devoteeId?: string;
  /** Switches this donation to a manual donor (clears devotee_id). Omit to leave the donor unchanged. */
  manualDonor?: ManualDonorInput;
  /** Null when switching to a non-cash donation. Cash/non-cash fields must be updated together. */
  amount?: number | null;
  purpose?: string;
  /** Null when switching to a non-cash donation. */
  paymentMethod?: PaymentMethod | null;
  /** Description of a material gift. Null when switching to a cash donation. */
  itemDescription?: string | null;
  notes?: string | null;
  donatedAt?: string;
}

export async function updateDonation(
  tenantId: string,
  donationId: string,
  input: UpdateDonationInput,
): Promise<Donation | null> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query<{ devotee_id: string | null }>(
      "SELECT devotee_id FROM donations WHERE tenant_id = $1 AND id = $2",
      [tenantId, donationId],
    );
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const previousDevoteeId = existing.rows[0].devotee_id;

    // Donor-source switch is all-or-nothing: providing either field
    // reassigns the full donor identity, never a partial mix of the two.
    const switchingToDevotee = input.devoteeId !== undefined;
    const switchingToManual = input.manualDonor !== undefined;

    // Presence booleans for fields that can be intentionally set to null (cash ↔ non-cash switch).
    // "key" in input distinguishes "omit field" (keep existing) from "set to null" (clear it).
    const hasAmount = "amount" in input;
    const hasPaymentMethod = "paymentMethod" in input;
    const hasItemDescription = "itemDescription" in input;

    const { rows } = await client.query<DonationRow>(
      `UPDATE donations
       SET devotee_id = CASE
             WHEN $3::boolean THEN $4
             WHEN $5::boolean THEN NULL
             ELSE devotee_id
           END,
           manual_donor_name = CASE
             WHEN $5::boolean THEN $6
             WHEN $3::boolean THEN NULL
             ELSE manual_donor_name
           END,
           manual_donor_phone = CASE
             WHEN $5::boolean THEN $7
             WHEN $3::boolean THEN NULL
             ELSE manual_donor_phone
           END,
           manual_donor_email = CASE
             WHEN $5::boolean THEN $8
             WHEN $3::boolean THEN NULL
             ELSE manual_donor_email
           END,
           manual_donor_address = CASE
             WHEN $5::boolean THEN $9
             WHEN $3::boolean THEN NULL
             ELSE manual_donor_address
           END,
           is_anonymous = CASE WHEN $5::boolean THEN $10 ELSE is_anonymous END,
           amount = CASE WHEN $11::boolean THEN $12 ELSE amount END,
           purpose = COALESCE($13, purpose),
           payment_method = CASE WHEN $14::boolean THEN $15 ELSE payment_method END,
           notes = CASE WHEN $16::boolean THEN $17 ELSE notes END,
           donated_at = COALESCE($18, donated_at),
           item_description = CASE WHEN $19::boolean THEN $20 ELSE item_description END,
           updated_at = now()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`,
      [
        tenantId,
        donationId,
        switchingToDevotee,
        input.devoteeId ?? null,
        switchingToManual,
        input.manualDonor?.name ?? null,
        input.manualDonor?.phone ?? null,
        input.manualDonor?.email ?? null,
        input.manualDonor?.address ?? null,
        input.manualDonor?.isAnonymous ?? false,
        hasAmount,
        input.amount ?? null,
        input.purpose ?? null,
        hasPaymentMethod,
        input.paymentMethod ?? null,
        "notes" in input,
        input.notes ?? null,
        input.donatedAt ?? null,
        hasItemDescription,
        input.itemDescription ?? null,
      ],
    );

    const updated = rows[0];
    await recomputeDevoteeDonationCache(client, previousDevoteeId);
    if (updated.devotee_id !== previousDevoteeId) {
      await recomputeDevoteeDonationCache(client, updated.devotee_id);
    }

    await client.query("COMMIT");
    return mapDonation(updated);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteDonation(tenantId: string, donationId: string, actorMembershipId: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");

    const linkedPayments = await client.query<{ id: string }>(
      "SELECT id FROM payment_transactions WHERE tenant_id = $1 AND donation_id = $2 ORDER BY created_at ASC",
      [tenantId, donationId],
    );

    const { rows } = await client.query<DonationRow>(
      "DELETE FROM donations WHERE tenant_id = $1 AND id = $2 RETURNING *",
      [tenantId, donationId],
    );
    const deleted = rows[0];
    if (!deleted) {
      await client.query("ROLLBACK");
      return false;
    }

    await createAuditLogEntry(
      {
        actorType: "tenant_member",
        actorId: actorMembershipId,
        tenantId,
        action: "donation.deleted",
        targetType: "donation",
        targetId: donationId,
        metadata: {
          amount: deleted.amount,
          purpose: deleted.purpose,
          paymentMethod: deleted.payment_method,
          itemDescription: deleted.item_description,
          donatedAt: deleted.donated_at.toISOString(),
          donorSource: deleted.devotee_id ? "devotee" : "manual",
          devoteeId: deleted.devotee_id,
          manualDonorPresent: deleted.manual_donor_name !== null,
          isAnonymous: deleted.is_anonymous,
          linkedPaymentTransactionIds: linkedPayments.rows.map((row) => row.id),
        },
      },
      client,
    );
    await recomputeDevoteeDonationCache(client, deleted.devotee_id);
    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Bulk variant of {@link deleteDonation} — one transaction, one round trip, dedupes affected devotees before recomputing their cached donation totals. Returns how many rows were actually deleted (ids that don't belong to this tenant are silently skipped, not an error). */
export async function deleteDonations(tenantId: string, donationIds: string[]): Promise<number> {
  if (donationIds.length === 0) return 0;
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ devotee_id: string | null }>(
      "DELETE FROM donations WHERE tenant_id = $1 AND id = ANY($2::uuid[]) RETURNING devotee_id",
      [tenantId, donationIds],
    );
    const affectedDevoteeIds = [...new Set(rows.map((row) => row.devotee_id).filter((id): id is string => id !== null))];
    for (const devoteeId of affectedDevoteeIds) {
      await recomputeDevoteeDonationCache(client, devoteeId);
    }
    await client.query("COMMIT");
    return rows.length;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Deletes every donation for the tenant — the "Delete All Donations" action.
 * Unlike {@link deleteDonations}, this doesn't need to dedupe/loop affected
 * devotees one at a time: since every donation is gone, every devotee's
 * donation cache resets to the same zeroed-out values in a single statement.
 */
export async function deleteAllDonations(tenantId: string): Promise<number> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rowCount } = await client.query("DELETE FROM donations WHERE tenant_id = $1", [tenantId]);
    await client.query(
      `UPDATE devotees
       SET is_donor = false, total_donated_amount = 0, last_donation_at = NULL, updated_at = now()
       WHERE tenant_id = $1 AND (is_donor OR total_donated_amount <> 0 OR last_donation_at IS NOT NULL)`,
      [tenantId],
    );
    await client.query("COMMIT");
    return rowCount ?? 0;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getDonationById(tenantId: string, donationId: string): Promise<Donation | null> {
  const { rows } = await getPool().query<DonationRow>(
    "SELECT * FROM donations WHERE tenant_id = $1 AND id = $2",
    [tenantId, donationId],
  );
  return rows[0] ? mapDonation(rows[0]) : null;
}

export interface ListDonationsFilter {
  search?: string;
  devoteeId?: string;
  dateFrom?: string;
  dateTo?: string;
  purpose?: string;
  page?: number;
  pageSize?: number;
  sort?: "date" | "amount" | "donor";
  dir?: "asc" | "desc";
}

const DONATION_SORT_COLUMNS: Record<NonNullable<ListDonationsFilter["sort"]>, string> = {
  date: "d.donated_at",
  amount: "d.amount",
  donor: "COALESCE(dev.display_name, d.manual_donor_name)",
};

function buildDonationConditions(
  filter: Pick<ListDonationsFilter, "search" | "devoteeId" | "dateFrom" | "dateTo" | "purpose">,
) {
  const conditions = ["d.tenant_id = $1"];
  const params: unknown[] = [];

  if (filter.search && filter.search.trim()) {
    params.push(`%${filter.search.trim()}%`);
    conditions.push(
      `(dev.display_name ILIKE $${params.length + 1} OR dev.whatsapp_phone ILIKE $${params.length + 1}
        OR d.manual_donor_name ILIKE $${params.length + 1} OR d.manual_donor_phone ILIKE $${params.length + 1})`,
    );
  }
  if (filter.devoteeId) {
    params.push(filter.devoteeId);
    conditions.push(`d.devotee_id = $${params.length + 1}`);
  }
  if (filter.dateFrom) {
    params.push(filter.dateFrom);
    conditions.push(`d.donated_at >= $${params.length + 1}`);
  }
  if (filter.dateTo) {
    params.push(filter.dateTo);
    conditions.push(`d.donated_at <= $${params.length + 1}`);
  }
  if (filter.purpose) {
    params.push(filter.purpose);
    conditions.push(`d.purpose = $${params.length + 1}`);
  }
  return { conditions, params };
}

/** `page`/`pageSize` are optional — omitted, this returns the full unpaginated result (existing callers rely on this). */
export async function listDonations(
  tenantId: string,
  filter: ListDonationsFilter = {},
): Promise<DonationWithDonor[]> {
  const { conditions, params: filterParams } = buildDonationConditions(filter);
  const params: unknown[] = [tenantId, ...filterParams];

  const sortColumn = filter.sort ? DONATION_SORT_COLUMNS[filter.sort] : "d.donated_at";
  const dir = filter.dir === "asc" ? "ASC" : "DESC";

  let query = `SELECT d.*,
       COALESCE(dev.display_name, d.manual_donor_name) AS donor_name,
       COALESCE(dev.whatsapp_phone, d.manual_donor_phone) AS donor_phone
     FROM donations d
     LEFT JOIN devotees dev ON dev.id = d.devotee_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${sortColumn} ${dir}`;

  if (filter.page !== undefined) {
    const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE;
    params.push(pageSize, computeOffset(filter.page, pageSize));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const { rows } = await getPool().query<DonationWithDonorRow>(query, params);
  return rows.map(mapDonationWithDonor);
}

export async function countDonationsFiltered(
  tenantId: string,
  filter: Pick<ListDonationsFilter, "search" | "devoteeId" | "dateFrom" | "dateTo" | "purpose"> = {},
): Promise<number> {
  const { conditions, params: filterParams } = buildDonationConditions(filter);
  const params: unknown[] = [tenantId, ...filterParams];
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count
     FROM donations d
     LEFT JOIN devotees dev ON dev.id = d.devotee_id
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.count ?? 0);
}

/** "Export Selected" — fetch exactly the rows an admin picked in the table. */
export async function listDonationsByIds(tenantId: string, ids: string[]): Promise<DonationWithDonor[]> {
  if (ids.length === 0) return [];
  const { rows } = await getPool().query<DonationWithDonorRow>(
    `SELECT d.*,
       COALESCE(dev.display_name, d.manual_donor_name) AS donor_name,
       COALESCE(dev.whatsapp_phone, d.manual_donor_phone) AS donor_phone
     FROM donations d
     LEFT JOIN devotees dev ON dev.id = d.devotee_id
     WHERE d.tenant_id = $1 AND d.id = ANY($2::uuid[])
     ORDER BY d.donated_at DESC`,
    [tenantId, ids],
  );
  return rows.map(mapDonationWithDonor);
}

export async function listDonationsByDevotee(tenantId: string, devoteeId: string): Promise<Donation[]> {
  const { rows } = await getPool().query<DonationRow>(
    "SELECT * FROM donations WHERE tenant_id = $1 AND devotee_id = $2 ORDER BY donated_at DESC",
    [tenantId, devoteeId],
  );
  return rows.map(mapDonation);
}

export async function getDonationSummary(tenantId: string): Promise<DonationSummary> {
  const { rows } = await getPool().query<{
    total_all_time: string;
    total_this_month: string;
    donor_count: string;
    donation_count: string;
  }>(
    `SELECT
       COALESCE((SELECT SUM(amount) FROM donations WHERE tenant_id = $1), 0) AS total_all_time,
       COALESCE((SELECT SUM(amount) FROM donations WHERE tenant_id = $1 AND donated_at >= date_trunc('month', now())), 0) AS total_this_month,
       (SELECT count(*) FROM devotees WHERE tenant_id = $1 AND is_donor = true) AS donor_count,
       (SELECT count(*) FROM donations WHERE tenant_id = $1) AS donation_count`,
    [tenantId],
  );
  const row = rows[0];
  return {
    totalAllTime: row.total_all_time,
    totalThisMonth: row.total_this_month,
    donorCount: Number(row.donor_count),
    donationCount: Number(row.donation_count),
  };
}

export interface DashboardDonationStats {
  total: string;
  count: number;
}

/**
 * Sum + count of donations matching the given filter — unfiltered (defaults),
 * this is the all-time total, exactly what the Dashboard's "Total Donations"
 * card shows when no date range/purpose is selected. Also powers the
 * Donations page's "Total Filtered Amount" summary card: same
 * buildDonationConditions() the table's own listDonations/countDonationsFiltered
 * use, so the card can never drift from what's actually in the filtered list
 * (a single SQL aggregate over every matching row, not just the current page).
 * The LEFT JOIN exists only so a `search` filter can match on
 * dev.display_name/whatsapp_phone — harmless when search is unset, and
 * donation_id -> devotee_id is one-to-one so it can't multiply rows.
 */
export async function getDashboardDonationStats(
  tenantId: string,
  filter: Pick<ListDonationsFilter, "search" | "dateFrom" | "dateTo" | "purpose"> = {},
): Promise<DashboardDonationStats> {
  const { conditions, params: filterParams } = buildDonationConditions(filter);
  const params: unknown[] = [tenantId, ...filterParams];
  const { rows } = await getPool().query<{ total: string; count: string }>(
    `SELECT COALESCE(SUM(d.amount), 0) AS total, count(*) AS count
     FROM donations d
     LEFT JOIN devotees dev ON dev.id = d.devotee_id
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return { total: rows[0]?.total ?? "0", count: Number(rows[0]?.count ?? 0) };
}

export interface DonationsPerDayRow {
  date: string;
  total: string;
}

/** Day-bucketed donation totals for the dashboard trend chart. Read-only aggregation, no new write path. */
export async function getDonationsPerDay(tenantId: string, days = 30): Promise<DonationsPerDayRow[]> {
  const { rows } = await getPool().query<{ day: Date; total: string }>(
    `SELECT date_trunc('day', donated_at) AS day, SUM(amount) AS total
     FROM donations
     WHERE tenant_id = $1 AND donated_at >= now() - ($2 || ' days')::interval
     GROUP BY day
     ORDER BY day ASC`,
    [tenantId, days],
  );
  return rows.map((row) => ({ date: row.day.toISOString(), total: row.total }));
}
