import { getPool } from "./pool";
import type { TempleSpecialDay } from "@/types/db";

interface TempleSpecialDayRow {
  id: string;
  tenant_id: string;
  date: string;
  occasion: string;
  is_closed: boolean;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapSpecialDay(row: TempleSpecialDayRow): TempleSpecialDay {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    date: row.date,
    occasion: row.occasion,
    isClosed: row.is_closed,
    morningOpen: row.morning_open,
    morningClose: row.morning_close,
    eveningOpen: row.evening_open,
    eveningClose: row.evening_close,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listSpecialDays(tenantId: string): Promise<TempleSpecialDay[]> {
  const { rows } = await getPool().query<TempleSpecialDayRow>(
    "SELECT * FROM temple_special_days WHERE tenant_id = $1 ORDER BY date ASC",
    [tenantId],
  );
  return rows.map(mapSpecialDay);
}

export async function getSpecialDayById(
  tenantId: string,
  id: string,
): Promise<TempleSpecialDay | null> {
  const { rows } = await getPool().query<TempleSpecialDayRow>(
    "SELECT * FROM temple_special_days WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
  return rows[0] ? mapSpecialDay(rows[0]) : null;
}

/** The WhatsApp bot's "check today for an override" lookup. */
export async function getSpecialDayForDate(
  tenantId: string,
  dateIso: string,
): Promise<TempleSpecialDay | null> {
  const { rows } = await getPool().query<TempleSpecialDayRow>(
    "SELECT * FROM temple_special_days WHERE tenant_id = $1 AND date = $2",
    [tenantId, dateIso],
  );
  return rows[0] ? mapSpecialDay(rows[0]) : null;
}

export interface CreateSpecialDayInput {
  date: string;
  occasion: string;
  isClosed: boolean;
  morningOpen: string | null;
  morningClose: string | null;
  eveningOpen: string | null;
  eveningClose: string | null;
}

export async function createSpecialDay(
  tenantId: string,
  input: CreateSpecialDayInput,
): Promise<TempleSpecialDay> {
  const { rows } = await getPool().query<TempleSpecialDayRow>(
    `INSERT INTO temple_special_days
       (tenant_id, date, occasion, is_closed, morning_open, morning_close, evening_open, evening_close)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      tenantId,
      input.date,
      input.occasion,
      input.isClosed,
      input.morningOpen,
      input.morningClose,
      input.eveningOpen,
      input.eveningClose,
    ],
  );
  return mapSpecialDay(rows[0]);
}

export type UpdateSpecialDayInput = Partial<CreateSpecialDayInput>;

export async function updateSpecialDay(
  tenantId: string,
  id: string,
  input: UpdateSpecialDayInput,
): Promise<TempleSpecialDay | null> {
  const { rows } = await getPool().query<TempleSpecialDayRow>(
    `UPDATE temple_special_days
     SET date = COALESCE($3, date),
         occasion = COALESCE($4, occasion),
         is_closed = COALESCE($5, is_closed),
         morning_open = CASE WHEN $6::boolean THEN $7::time ELSE morning_open END,
         morning_close = CASE WHEN $8::boolean THEN $9::time ELSE morning_close END,
         evening_open = CASE WHEN $10::boolean THEN $11::time ELSE evening_open END,
         evening_close = CASE WHEN $12::boolean THEN $13::time ELSE evening_close END,
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      id,
      input.date ?? null,
      input.occasion ?? null,
      input.isClosed ?? null,
      input.morningOpen !== undefined,
      input.morningOpen ?? null,
      input.morningClose !== undefined,
      input.morningClose ?? null,
      input.eveningOpen !== undefined,
      input.eveningOpen ?? null,
      input.eveningClose !== undefined,
      input.eveningClose ?? null,
    ],
  );
  return rows[0] ? mapSpecialDay(rows[0]) : null;
}

export async function deleteSpecialDay(tenantId: string, id: string): Promise<boolean> {
  const result = await getPool().query(
    "DELETE FROM temple_special_days WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
  return (result.rowCount ?? 0) > 0;
}
