import { getPool } from "./pool";
import type { DayOfWeek, TempleSeva } from "@/types/db";

interface TempleSevaRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  price: string | null;
  duration: string | null;
  available_days: DayOfWeek[];
  booking_enabled: boolean;
  display_order: number;
  created_at: Date;
  updated_at: Date;
}

function mapSeva(row: TempleSevaRow): TempleSeva {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    price: row.price,
    duration: row.duration,
    availableDays: row.available_days,
    bookingEnabled: row.booking_enabled,
    displayOrder: row.display_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listSevas(tenantId: string): Promise<TempleSeva[]> {
  const { rows } = await getPool().query<TempleSevaRow>(
    "SELECT * FROM temple_sevas WHERE tenant_id = $1 ORDER BY display_order ASC, created_at ASC",
    [tenantId],
  );
  return rows.map(mapSeva);
}

export async function getSevaById(tenantId: string, id: string): Promise<TempleSeva | null> {
  const { rows } = await getPool().query<TempleSevaRow>(
    "SELECT * FROM temple_sevas WHERE tenant_id = $1 AND id = $2",
    [tenantId, id],
  );
  return rows[0] ? mapSeva(rows[0]) : null;
}

export interface CreateSevaInput {
  name: string;
  description: string | null;
  price: number | null;
  duration: string | null;
  availableDays: DayOfWeek[];
  bookingEnabled: boolean;
}

/** display_order is server-computed (append to the end), never client-supplied. */
export async function createSeva(tenantId: string, input: CreateSevaInput): Promise<TempleSeva> {
  const { rows } = await getPool().query<TempleSevaRow>(
    `INSERT INTO temple_sevas
       (tenant_id, name, description, price, duration, available_days, booking_enabled, display_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7,
       (SELECT COALESCE(MAX(display_order), -1) + 1 FROM temple_sevas WHERE tenant_id = $1))
     RETURNING *`,
    [
      tenantId,
      input.name,
      input.description,
      input.price,
      input.duration,
      input.availableDays,
      input.bookingEnabled,
    ],
  );
  return mapSeva(rows[0]);
}

export type UpdateSevaInput = Partial<CreateSevaInput>;

export async function updateSeva(
  tenantId: string,
  id: string,
  input: UpdateSevaInput,
): Promise<TempleSeva | null> {
  const { rows } = await getPool().query<TempleSevaRow>(
    `UPDATE temple_sevas
     SET name = COALESCE($3, name),
         description = CASE WHEN $4::boolean THEN $5 ELSE description END,
         price = CASE WHEN $6::boolean THEN $7 ELSE price END,
         duration = CASE WHEN $8::boolean THEN $9 ELSE duration END,
         available_days = COALESCE($10, available_days),
         booking_enabled = COALESCE($11, booking_enabled),
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      id,
      input.name ?? null,
      input.description !== undefined,
      input.description ?? null,
      input.price !== undefined,
      input.price ?? null,
      input.duration !== undefined,
      input.duration ?? null,
      input.availableDays ?? null,
      input.bookingEnabled ?? null,
    ],
  );
  return rows[0] ? mapSeva(rows[0]) : null;
}

export async function deleteSeva(tenantId: string, id: string): Promise<boolean> {
  const result = await getPool().query("DELETE FROM temple_sevas WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}
