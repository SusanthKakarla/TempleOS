import { getPool } from "./pool";
import type { Event, EventStatus } from "@/types/db";

interface EventRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: Date;
  ends_at: Date | null;
  status: EventStatus;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapEvent(row: EventRow): Event {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at ? row.ends_at.toISOString() : null,
    status: row.status,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export async function listEvents(
  tenantId: string,
  filter: { status?: EventStatus; upcomingOnly?: boolean } = {},
): Promise<Event[]> {
  const conditions = ["tenant_id = $1"];
  const params: unknown[] = [tenantId];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`status = $${params.length}`);
  }
  if (filter.upcomingOnly) {
    conditions.push("starts_at >= now()");
  }

  const { rows } = await getPool().query<EventRow>(
    `SELECT * FROM events WHERE ${conditions.join(" AND ")} ORDER BY starts_at ASC`,
    params,
  );
  return rows.map(mapEvent);
}

export async function getEventById(tenantId: string, eventId: string): Promise<Event | null> {
  const { rows } = await getPool().query<EventRow>(
    "SELECT * FROM events WHERE tenant_id = $1 AND id = $2",
    [tenantId, eventId],
  );
  return rows[0] ? mapEvent(rows[0]) : null;
}

export interface CreateEventInput {
  title: string;
  description: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string | null;
  status: EventStatus;
  createdBy: string;
}

export async function createEvent(tenantId: string, input: CreateEventInput): Promise<Event> {
  const { rows } = await getPool().query<EventRow>(
    `INSERT INTO events (tenant_id, title, description, location, starts_at, ends_at, status, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      tenantId,
      input.title,
      input.description,
      input.location,
      input.startsAt,
      input.endsAt,
      input.status,
      input.createdBy,
    ],
  );
  return mapEvent(rows[0]);
}

export interface UpdateEventInput {
  title?: string;
  description?: string | null;
  location?: string | null;
  startsAt?: string;
  endsAt?: string | null;
  status?: EventStatus;
}

export async function updateEvent(
  tenantId: string,
  eventId: string,
  input: UpdateEventInput,
): Promise<Event | null> {
  const { rows } = await getPool().query<EventRow>(
    `UPDATE events
     SET title = COALESCE($3, title),
         description = CASE WHEN $4::boolean THEN $5 ELSE description END,
         location = CASE WHEN $6::boolean THEN $7 ELSE location END,
         starts_at = COALESCE($8, starts_at),
         ends_at = CASE WHEN $9::boolean THEN $10 ELSE ends_at END,
         status = COALESCE($11, status),
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      eventId,
      input.title ?? null,
      "description" in input,
      input.description ?? null,
      "location" in input,
      input.location ?? null,
      input.startsAt ?? null,
      "endsAt" in input,
      input.endsAt ?? null,
      input.status ?? null,
    ],
  );
  return rows[0] ? mapEvent(rows[0]) : null;
}

export async function deleteEvent(tenantId: string, eventId: string): Promise<boolean> {
  const result = await getPool().query("DELETE FROM events WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    eventId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

export async function countUpcomingPublishedEvents(tenantId: string): Promise<number> {
  const { rows } = await getPool().query<{ count: string }>(
    "SELECT count(*) FROM events WHERE tenant_id = $1 AND status = 'published' AND starts_at >= now()",
    [tenantId],
  );
  return Number(rows[0].count);
}
