import { randomBytes } from "node:crypto";
import { getPool } from "./pool";
import type { Campaign, CampaignAudienceFilter, CampaignStatus, CampaignType, NotificationChannel, NotificationType } from "@/types/db";
import { DEFAULT_PAGE_SIZE, computeOffset } from "@/lib/pagination";

function slugifyTitle(title: string): string {
  const normalized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return (normalized || "campaign").slice(0, 54);
}

/** Globally unique (not per-tenant) — matches tenants.slug's own scope, since the donation URL is /donate/{tenantSlug}/{campaignSlug}/{token}. */
function generateCampaignSlug(title: string): string {
  return `${slugifyTitle(title)}-${randomBytes(4).toString("hex")}`;
}

/** Stable per campaign (many donors reuse the same link) — an unguessable identifier, not a single-use token. */
function generateDonationToken(): string {
  return randomBytes(16).toString("base64url");
}

interface CampaignRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  campaign_type: CampaignType;
  status: CampaignStatus;
  channel: NotificationChannel;
  template_key: NotificationType | null;
  custom_message: string | null;
  audience_filter: CampaignAudienceFilter;
  banner_media_id: string | null;
  linked_event_id: string | null;
  linked_donation_purpose: string | null;
  schedule_type: "one_time" | "recurring";
  scheduled_at: Date | null;
  recurrence_rule: string | null;
  next_run_at: Date | null;
  last_run_at: Date | null;
  goal_amount: string | null;
  // DATE columns (OID 1082): lib/db/pool.ts registers a type parser that
  // returns the raw "YYYY-MM-DD" string as-is rather than a JS Date, so no
  // conversion is needed (or possible — these are already plain strings).
  campaign_start_date: string | null;
  campaign_end_date: string | null;
  donation_link_override: string | null;
  closing_reminder_sent_at: Date | null;
  target_reached_announced_at: Date | null;
  slug: string;
  donation_token: string;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    campaignType: row.campaign_type,
    status: row.status,
    channel: row.channel,
    templateKey: row.template_key,
    customMessage: row.custom_message,
    audienceFilter: row.audience_filter,
    bannerMediaId: row.banner_media_id,
    linkedEventId: row.linked_event_id,
    linkedDonationPurpose: row.linked_donation_purpose,
    scheduleType: row.schedule_type,
    scheduledAt: row.scheduled_at ? row.scheduled_at.toISOString() : null,
    recurrenceRule: row.recurrence_rule,
    nextRunAt: row.next_run_at ? row.next_run_at.toISOString() : null,
    lastRunAt: row.last_run_at ? row.last_run_at.toISOString() : null,
    goalAmount: row.goal_amount,
    campaignStartDate: row.campaign_start_date,
    campaignEndDate: row.campaign_end_date,
    donationLinkOverride: row.donation_link_override,
    closingReminderSentAt: row.closing_reminder_sent_at ? row.closing_reminder_sent_at.toISOString() : null,
    targetReachedAnnouncedAt: row.target_reached_announced_at ? row.target_reached_announced_at.toISOString() : null,
    slug: row.slug,
    donationToken: row.donation_token,
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface ListCampaignsFilter {
  status?: CampaignStatus;
  campaignType?: CampaignType;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: "created" | "title" | "status";
  dir?: "asc" | "desc";
}

const CAMPAIGN_SORT_COLUMNS: Record<NonNullable<ListCampaignsFilter["sort"]>, string> = {
  created: "created_at",
  title: "title",
  status: "status",
};

function buildCampaignConditions(filter: Pick<ListCampaignsFilter, "status" | "campaignType" | "search">) {
  const conditions = ["tenant_id = $1"];
  const params: unknown[] = [];

  if (filter.status) {
    params.push(filter.status);
    conditions.push(`status = $${params.length + 1}`);
  } else {
    // Default view excludes archived campaigns, same convention as devotees'
    // "status" filter defaulting to active-only.
    conditions.push("status != 'archived'");
  }
  if (filter.campaignType) {
    params.push(filter.campaignType);
    conditions.push(`campaign_type = $${params.length + 1}`);
  }
  if (filter.search && filter.search.trim()) {
    params.push(`%${filter.search.trim()}%`);
    conditions.push(`title ILIKE $${params.length + 1}`);
  }
  return { conditions, params };
}

export async function listCampaigns(tenantId: string, filter: ListCampaignsFilter = {}): Promise<Campaign[]> {
  const { conditions, params: filterParams } = buildCampaignConditions(filter);
  const params: unknown[] = [tenantId, ...filterParams];

  const sortColumn = filter.sort ? CAMPAIGN_SORT_COLUMNS[filter.sort] : "created_at";
  const dir = filter.dir === "asc" ? "ASC" : "DESC";

  let query = `SELECT * FROM campaigns WHERE ${conditions.join(" AND ")} ORDER BY ${sortColumn} ${dir}`;

  if (filter.page !== undefined) {
    const pageSize = filter.pageSize ?? DEFAULT_PAGE_SIZE;
    params.push(pageSize, computeOffset(filter.page, pageSize));
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;
  }

  const { rows } = await getPool().query<CampaignRow>(query, params);
  return rows.map(mapCampaign);
}

export async function countCampaignsFiltered(
  tenantId: string,
  filter: Pick<ListCampaignsFilter, "status" | "campaignType" | "search"> = {},
): Promise<number> {
  const { conditions, params: filterParams } = buildCampaignConditions(filter);
  const params: unknown[] = [tenantId, ...filterParams];
  const { rows } = await getPool().query<{ count: string }>(
    `SELECT count(*) AS count FROM campaigns WHERE ${conditions.join(" AND ")}`,
    params,
  );
  return Number(rows[0]?.count ?? 0);
}

/** "Export Selected" — fetch exactly the rows an admin picked in the table. */
export async function listCampaignsByIds(tenantId: string, ids: string[]): Promise<Campaign[]> {
  if (ids.length === 0) return [];
  const { rows } = await getPool().query<CampaignRow>(
    "SELECT * FROM campaigns WHERE tenant_id = $1 AND id = ANY($2::uuid[]) ORDER BY created_at DESC",
    [tenantId, ids],
  );
  return rows.map(mapCampaign);
}

export async function getCampaignById(tenantId: string, campaignId: string): Promise<Campaign | null> {
  const { rows } = await getPool().query<CampaignRow>(
    "SELECT * FROM campaigns WHERE tenant_id = $1 AND id = $2",
    [tenantId, campaignId],
  );
  return rows[0] ? mapCampaign(rows[0]) : null;
}

/** Public donation-page lookup (tenant already resolved from the URL's tenantSlug segment). */
export async function getCampaignBySlugForTenant(tenantId: string, slug: string): Promise<Campaign | null> {
  const { rows } = await getPool().query<CampaignRow>(
    "SELECT * FROM campaigns WHERE tenant_id = $1 AND slug = $2",
    [tenantId, slug],
  );
  return rows[0] ? mapCampaign(rows[0]) : null;
}

export interface CreateCampaignInput {
  title: string;
  description: string | null;
  campaignType: CampaignType;
  channel: NotificationChannel;
  templateKey: NotificationType | null;
  customMessage: string | null;
  audienceFilter: CampaignAudienceFilter;
  bannerMediaId: string | null;
  linkedEventId: string | null;
  linkedDonationPurpose: string | null;
  scheduleType: "one_time" | "recurring";
  scheduledAt: string | null;
  recurrenceRule: string | null;
  goalAmount: string | null;
  campaignStartDate: string | null;
  campaignEndDate: string | null;
  donationLinkOverride: string | null;
  createdBy: string;
}

/** Always created as `draft` — scheduling/running is a separate, explicit status transition (see updateCampaignStatus). */
export async function createCampaign(tenantId: string, input: CreateCampaignInput): Promise<Campaign> {
  const { rows } = await getPool().query<CampaignRow>(
    `INSERT INTO campaigns (
       tenant_id, title, description, campaign_type, channel, template_key, custom_message,
       audience_filter, banner_media_id, linked_event_id, linked_donation_purpose,
       schedule_type, scheduled_at, recurrence_rule,
       goal_amount, campaign_start_date, campaign_end_date, donation_link_override, created_by,
       slug, donation_token
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
     RETURNING *`,
    [
      tenantId,
      input.title,
      input.description,
      input.campaignType,
      input.channel,
      input.templateKey,
      input.customMessage,
      JSON.stringify(input.audienceFilter),
      input.bannerMediaId,
      input.linkedEventId,
      input.linkedDonationPurpose,
      input.scheduleType,
      input.scheduledAt,
      input.recurrenceRule,
      input.goalAmount,
      input.campaignStartDate,
      input.campaignEndDate,
      input.donationLinkOverride,
      input.createdBy,
      generateCampaignSlug(input.title),
      generateDonationToken(),
    ],
  );
  return mapCampaign(rows[0]);
}

export interface UpdateCampaignInput {
  title?: string;
  description?: string | null;
  campaignType?: CampaignType;
  templateKey?: NotificationType | null;
  customMessage?: string | null;
  audienceFilter?: CampaignAudienceFilter;
  bannerMediaId?: string | null;
  linkedEventId?: string | null;
  linkedDonationPurpose?: string | null;
  scheduleType?: "one_time" | "recurring";
  scheduledAt?: string | null;
  recurrenceRule?: string | null;
  goalAmount?: string | null;
  campaignStartDate?: string | null;
  campaignEndDate?: string | null;
  donationLinkOverride?: string | null;
}

/** Draft-only edit surface — once a campaign leaves draft, only status transitions (updateCampaignStatus) are allowed, enforced by the API layer, not here. */
export async function updateCampaign(
  tenantId: string,
  campaignId: string,
  input: UpdateCampaignInput,
): Promise<Campaign | null> {
  const { rows } = await getPool().query<CampaignRow>(
    `UPDATE campaigns
     SET title = COALESCE($3, title),
         description = CASE WHEN $4::boolean THEN $5 ELSE description END,
         campaign_type = COALESCE($6, campaign_type),
         template_key = CASE WHEN $7::boolean THEN $8 ELSE template_key END,
         custom_message = CASE WHEN $9::boolean THEN $10 ELSE custom_message END,
         audience_filter = COALESCE($11, audience_filter),
         banner_media_id = CASE WHEN $12::boolean THEN $13 ELSE banner_media_id END,
         linked_event_id = CASE WHEN $14::boolean THEN $15 ELSE linked_event_id END,
         linked_donation_purpose = CASE WHEN $16::boolean THEN $17 ELSE linked_donation_purpose END,
         schedule_type = COALESCE($18, schedule_type),
         scheduled_at = CASE WHEN $19::boolean THEN $20 ELSE scheduled_at END,
         recurrence_rule = CASE WHEN $21::boolean THEN $22 ELSE recurrence_rule END,
         goal_amount = CASE WHEN $23::boolean THEN $24::numeric ELSE goal_amount END,
         campaign_start_date = CASE WHEN $25::boolean THEN $26::date ELSE campaign_start_date END,
         campaign_end_date = CASE WHEN $27::boolean THEN $28::date ELSE campaign_end_date END,
         donation_link_override = CASE WHEN $29::boolean THEN $30 ELSE donation_link_override END,
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      campaignId,
      input.title ?? null,
      "description" in input,
      input.description ?? null,
      input.campaignType ?? null,
      "templateKey" in input,
      input.templateKey ?? null,
      "customMessage" in input,
      input.customMessage ?? null,
      input.audienceFilter ? JSON.stringify(input.audienceFilter) : null,
      "bannerMediaId" in input,
      input.bannerMediaId ?? null,
      "linkedEventId" in input,
      input.linkedEventId ?? null,
      "linkedDonationPurpose" in input,
      input.linkedDonationPurpose ?? null,
      input.scheduleType ?? null,
      "scheduledAt" in input,
      input.scheduledAt ?? null,
      "recurrenceRule" in input,
      input.recurrenceRule ?? null,
      "goalAmount" in input,
      input.goalAmount ?? null,
      "campaignStartDate" in input,
      input.campaignStartDate ?? null,
      "campaignEndDate" in input,
      input.campaignEndDate ?? null,
      "donationLinkOverride" in input,
      input.donationLinkOverride ?? null,
    ],
  );
  return rows[0] ? mapCampaign(rows[0]) : null;
}

/**
 * The only path that changes `status`, plus the scheduling fields that move
 * in lockstep with it (`next_run_at`, `last_run_at`) — kept separate from
 * `updateCampaign` so every lifecycle transition (draft→scheduled→running→
 * paused→completed→archived/cancelled) goes through one auditable place.
 */
export async function updateCampaignStatus(
  tenantId: string,
  campaignId: string,
  status: CampaignStatus,
  opts: { nextRunAt?: string | null; lastRunAt?: string | null } = {},
): Promise<Campaign | null> {
  const { rows } = await getPool().query<CampaignRow>(
    `UPDATE campaigns
     SET status = $3,
         next_run_at = CASE WHEN $4::boolean THEN $5 ELSE next_run_at END,
         last_run_at = CASE WHEN $6::boolean THEN $7 ELSE last_run_at END,
         updated_at = now()
     WHERE tenant_id = $1 AND id = $2
     RETURNING *`,
    [
      tenantId,
      campaignId,
      status,
      "nextRunAt" in opts,
      opts.nextRunAt ?? null,
      "lastRunAt" in opts,
      opts.lastRunAt ?? null,
    ],
  );
  return rows[0] ? mapCampaign(rows[0]) : null;
}

/** Restricted to `draft` campaigns by the API layer — anything that ever ran is archived, never deleted, so delivery history stays intact. */
export async function deleteCampaign(tenantId: string, campaignId: string): Promise<boolean> {
  const result = await getPool().query("DELETE FROM campaigns WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    campaignId,
  ]);
  return (result.rowCount ?? 0) > 0;
}

/** Every due, currently-scheduled campaign — the campaign scheduler cron's only query. */
export async function listDueCampaigns(limit = 50): Promise<Campaign[]> {
  const { rows } = await getPool().query<CampaignRow>(
    `SELECT * FROM campaigns
     WHERE status = 'scheduled' AND next_run_at IS NOT NULL AND next_run_at <= now()
     ORDER BY next_run_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows.map(mapCampaign);
}

/** Running donation campaigns whose fundraising window ends tomorrow and haven't had a reminder sent yet — fires once per campaign, gated by closing_reminder_sent_at. */
export async function listCampaignsNeedingClosingReminder(limit = 50): Promise<Campaign[]> {
  const { rows } = await getPool().query<CampaignRow>(
    `SELECT * FROM campaigns
     WHERE status = 'running'
       AND campaign_type = 'donation'
       AND goal_amount IS NOT NULL
       AND campaign_end_date = (now() AT TIME ZONE 'UTC')::date + INTERVAL '1 day'
       AND closing_reminder_sent_at IS NULL
     ORDER BY campaign_end_date ASC
     LIMIT $1`,
    [limit],
  );
  return rows.map(mapCampaign);
}

/** Running donation campaigns whose live-aggregated raised amount has met or passed their goal, not yet announced — fires once per campaign, gated by target_reached_announced_at. */
export async function listCampaignsReachingGoal(limit = 50): Promise<Campaign[]> {
  const { rows } = await getPool().query<CampaignRow>(
    `SELECT c.* FROM campaigns c
     WHERE c.status = 'running'
       AND c.campaign_type = 'donation'
       AND c.goal_amount IS NOT NULL
       AND c.linked_donation_purpose IS NOT NULL
       AND c.target_reached_announced_at IS NULL
       AND COALESCE((
         SELECT SUM(d.amount) FROM donations d
         WHERE d.tenant_id = c.tenant_id AND d.purpose = c.linked_donation_purpose
       ), 0) >= c.goal_amount
     ORDER BY c.created_at ASC
     LIMIT $1`,
    [limit],
  );
  return rows.map(mapCampaign);
}

export async function markClosingReminderSent(tenantId: string, campaignId: string): Promise<void> {
  await getPool().query("UPDATE campaigns SET closing_reminder_sent_at = now() WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    campaignId,
  ]);
}

export async function markTargetReachedAnnounced(tenantId: string, campaignId: string): Promise<void> {
  await getPool().query("UPDATE campaigns SET target_reached_announced_at = now() WHERE tenant_id = $1 AND id = $2", [
    tenantId,
    campaignId,
  ]);
}
