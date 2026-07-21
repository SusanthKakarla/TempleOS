import { getPool } from "./pool";
import type { Event, EventStatus } from "@/types/db";
import { DEFAULT_PAGE_SIZE, computeOffset } from "@/lib/pagination";

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

export interface ListEventsFilter {
  status?: EventStatus;
  upcomingOnly?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "date" | "title" | "status";
  dir?: "asc" | "desc";
}

const EVENT_SORT_COLUMNS: Record<NonNullable<ListEventsFilter["sort"]>, string> = {
  date: "starts_at",
  title: "title",
  status: "status",
};

function buildEventConditions(filter: Pick<ListEventsFilter, "status" | "upcomingOnly">) {
  const conditions = ["tenant_id = $1"];
  const params: unknown[] = [];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`status = $${params.length + 1}`);
  }
  if (filter.upcomingOnly) {
    conditions.push("starts_at >= now()");
  }
  return { conditions, params };
}

/** `page`/`pageSize` are optional — omitted, this returns the full unpaginated result (existing callers rely on this). */
export async function listEvents(tenantId: string, filter: ListEventsFilter = {}): Promise<Event[]> {
  const { conditions, params: filterParams } = buildEventConditions(filter);
  const params: unknown[] = [tenantId, ...filterParams];

  const sortColumn = filter.sort ? EVENT_SORT_COLUMNS[filter.sort] : "starts_at";
  const dir = filter.dir === "desc" ? "DESC" : "ASC";

  let query = `SELECT * FROM events WHERE ${conditions.join(" AND ")} ORDER BY ${sortColumn} ${dir}`;

  if (filter.page !== undefined) {
    const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE;
    params.push(pageSize, computeOffset(filter.page, pageSize));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const { rows } = await getPool().query<EventRow>(query, params);
  return rows.map(mapEvent);
}

export async function countEventsFiltered(
  tenantId: string,
  filter: Pick<ListEventsFilter, "status" | "upcomingOnly"> = {},
): Promise<number> {
  const { conditions, params: filterParams } = buildEventConditions(filter);
  const params: unknown[] = [tenantId, ...filterParams];
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM events WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.count ?? 0);
}

/** "Export Selected" — fetch exactly the rows an admin picked in the table. */
export async function listEventsByIds(tenantId: string, ids: string[]): Promise<Event[]> {
  if (ids.length === 0) return [];
  const { rows } = await getPool().query<EventRow>(
    "SELECT * FROM events WHERE tenant_id = $1 AND id = ANY($2::uuid[]) ORDER BY starts_at ASC",
    [tenantId, ids],
  );
  return rows.map(mapEvent);
}

/**
 * Used by app/api/cron/event-reminders/route.ts. "Tomorrow" is computed in
 * the tenant's own timezone. Dedups against an event_reminder notification
 * already existing for this event (a reminder is only ever sent once per
 * event, not once per day it remains "starting tomorrow").
 */
export async function listPublishedEventsStartingTomorrow(tenantId: string, timezone: string): Promise<Event[]> {
  const { rows } = await getPool().query<EventRow>(
    `SELECT e.* FROM events e
     WHERE e.tenant_id = $1
       AND e.status = 'published'
       AND (e.starts_at AT TIME ZONE $2)::date = ((now() AT TIME ZONE $2) + interval '1 day')::date
       AND NOT EXISTS (
         SELECT 1 FROM notifications n
         WHERE n.tenant_id = e.tenant_id
           AND n.notification_type = 'event_reminder'
           AND n.metadata->>'eventId' = e.id::text
       )`,
    [tenantId, timezone],
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
