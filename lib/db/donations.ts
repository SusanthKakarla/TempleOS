import type { PoolClient } from "pg";
import { getPool } from "./pool";
import type { Donation, DonationSummary, DonationWithDonor, PaymentMethod } from "@/types/db";
import { DEFAULT_PAGE_SIZE, computeOffset } from "@/lib/pagination";

interface DonationRow {
  id: string;
  tenant_id: string;
  devotee_id: string;
  amount: string;
  purpose: string;
  payment_method: PaymentMethod;
  notes: string | null;
  donated_at: Date;
  recorded_by: string | null;
  created_at: Date;
  updated_at: Date;
}

interface DonationWithDonorRow extends DonationRow {
  donor_name: string;
  donor_phone: string;
}

function mapDonation(row: DonationRow): Donation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    devoteeId: row.devotee_id,
    amount: row.amount,
    purpose: row.purpose,
    paymentMethod: row.payment_method,
    notes: row.notes,
    donatedAt: row.donated_at.toISOString(),
    recordedBy: row.recorded_by,
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
 * the same transaction as the donation write it follows.
 */
async function recomputeDevoteeDonationCache(client: PoolClient, devoteeId: string): Promise<void> {
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

export interface CreateDonationInput {
  devoteeId: string;
  amount: number;
  purpose: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  donatedAt: string;
  recordedBy: string | null;
}

export async function createDonation(tenantId: string, input: CreateDonationInput): Promise<Donation> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<DonationRow>(
      `INSERT INTO donations (tenant_id, devotee_id, amount, purpose, payment_method, notes, donated_at, recorded_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
  devoteeId?: string;
  amount?: number;
  purpose?: string;
  paymentMethod?: PaymentMethod;
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

    const existing = await client.query<{ devotee_id: string }>(
      "SELECT devotee_id FROM donations WHERE tenant_id = $1 AND id = $2",
      [tenantId, donationId],
    );
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const previousDevoteeId = existing.rows[0].devotee_id;

    const { rows } = await client.query<DonationRow>(
      `UPDATE donations
       SET devotee_id = COALESCE($3, devotee_id),
           amount = COALESCE($4, amount),
           purpose = COALESCE($5, purpose),
           payment_method = COALESCE($6, payment_method),
           notes = CASE WHEN $7::boolean THEN $8 ELSE notes END,
           donated_at = COALESCE($9, donated_at),
           updated_at = now()
       WHERE tenant_id = $1 AND id = $2
       RETURNING *`,
      [
        tenantId,
        donationId,
        input.devoteeId ?? null,
        input.amount ?? null,
        input.purpose ?? null,
        input.paymentMethod ?? null,
        "notes" in input,
        input.notes ?? null,
        input.donatedAt ?? null,
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

export async function deleteDonation(tenantId: string, donationId: string): Promise<boolean> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ devotee_id: string }>(
      "DELETE FROM donations WHERE tenant_id = $1 AND id = $2 RETURNING devotee_id",
      [tenantId, donationId],
    );
    if (!rows[0]) {
      await client.query("ROLLBACK");
      return false;
    }
    await recomputeDevoteeDonationCache(client, rows[0].devotee_id);
    await client.query("COMMIT");
    return true;
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
  page?: number;
  pageSize?: number;
  sort?: "date" | "amount" | "donor";
  dir?: "asc" | "desc";
}

const DONATION_SORT_COLUMNS: Record<NonNullable<ListDonationsFilter["sort"]>, string> = {
  date: "d.donated_at",
  amount: "d.amount",
  donor: "dev.display_name",
};

function buildDonationConditions(filter: Pick<ListDonationsFilter, "search" | "devoteeId" | "dateFrom" | "dateTo">) {
  const conditions = ["d.tenant_id = $1"];
  const params: unknown[] = [];

  if (filter.search && filter.search.trim()) {
    params.push(`%${filter.search.trim()}%`);
    conditions.push(`(dev.display_name ILIKE $${params.length + 1} OR dev.whatsapp_phone ILIKE $${params.length + 1})`);
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

  let query = `SELECT d.*, dev.display_name AS donor_name, dev.whatsapp_phone AS donor_phone
     FROM donations d
     JOIN devotees dev ON dev.id = d.devotee_id
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
  filter: Pick<ListDonationsFilter, "search" | "devoteeId" | "dateFrom" | "dateTo"> = {},
): Promise<number> {
  const { conditions, params: filterParams } = buildDonationConditions(filter);
  const params: unknown[] = [tenantId, ...filterParams];
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count
     FROM donations d
     JOIN devotees dev ON dev.id = d.devotee_id
     WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.count ?? 0);
}

/** "Export Selected" — fetch exactly the rows an admin picked in the table. */
export async function listDonationsByIds(tenantId: string, ids: string[]): Promise<DonationWithDonor[]> {
  if (ids.length === 0) return [];
  const { rows } = await getPool().query<DonationWithDonorRow>(
    `SELECT d.*, dev.display_name AS donor_name, dev.whatsapp_phone AS donor_phone
     FROM donations d
     JOIN devotees dev ON dev.id = d.devotee_id
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
