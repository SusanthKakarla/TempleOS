import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import { createAuditLogEntry } from "./audit-log";
import {
  isRoleCode,
  type RoleCode,
  type Tenant,
  type TenantDomain,
  type TenantStatus,
  type WhatsAppAccount,
} from "@/types/db";

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  default_contact_phone: string | null;
  address: string | null;
  timezone: string;
  welcome_message: string | null;
  description: string | null;
  history: string | null;
  contact_email: string | null;
  google_maps_link: string | null;
  morning_open: string | null;
  morning_close: string | null;
  evening_open: string | null;
  evening_close: string | null;
  donation_info: string | null;
  notify_on_new_event: boolean;
  notify_on_event_updated: boolean;
  notify_on_event_cancelled: boolean;
  created_at: Date;
  updated_at: Date;
}

interface SuperAdminTenantSummaryRow {
  id: string;
  slug: string;
  name: string;
  primary_hostname: string | null;
  primary_admin_name: string | null;
  primary_admin_phone_number: string | null;
  active_member_count: number | string;
  whatsapp_status: "linked" | "unlinked";
  last_updated_at: Date | null;
}

interface SuperAdminTenantMemberRow {
  id: string;
  tenant_id: string;
  person_id: string;
  display_name: string;
  phone_number: string;
  status: "active" | "inactive";
  role_codes: string[] | null;
  created_at: Date;
  updated_at: Date;
}

interface TenantDomainRow {
  id: string;
  tenant_id: string;
  hostname: string;
  kind: TenantDomain["kind"];
  status: TenantDomain["status"];
  created_at: Date;
  updated_at: Date;
}

interface WhatsAppAccountRow {
  id: string;
  tenant_id: string;
  phone_number: string;
  meta_phone_number_id: string;
  meta_business_account_id: string;
  business_name: string | null;
  phone_verification_status: string | null;
  webhook_subscribed: boolean;
  status: WhatsAppAccount["status"];
  connected_at: Date | null;
  disconnected_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface SuperAdminTenantSummary {
  id: string;
  slug: string;
  name: string;
  primaryHostname: string | null;
  primaryAdminName: string | null;
  primaryAdminPhoneNumber: string | null;
  activeMemberCount: number;
  whatsappStatus: "linked" | "unlinked";
  lastUpdatedAt: string | null;
}

export interface SuperAdminTenantMember {
  id: string;
  tenantId: string;
  personId: string;
  displayName: string;
  phoneNumber: string;
  status: "active" | "inactive";
  roles: RoleCode[];
  createdAt: string;
  updatedAt: string;
}

export interface SuperAdminTenantDetail {
  tenant: Tenant;
  domain: TenantDomain | null;
  members: SuperAdminTenantMember[];
  whatsappAccount: WhatsAppAccount | null;
}

function mapTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    status: row.status,
    defaultContactPhone: row.default_contact_phone,
    address: row.address,
    timezone: row.timezone,
    welcomeMessage: row.welcome_message,
    description: row.description,
    history: row.history,
    contactEmail: row.contact_email,
    googleMapsLink: row.google_maps_link,
    morningOpen: row.morning_open,
    morningClose: row.morning_close,
    eveningOpen: row.evening_open,
    eveningClose: row.evening_close,
    donationInfo: row.donation_info,
    notifyOnNewEvent: row.notify_on_new_event,
    notifyOnEventUpdated: row.notify_on_event_updated,
    notifyOnEventCancelled: row.notify_on_event_cancelled,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapSuperAdminTenantSummary(row: SuperAdminTenantSummaryRow): SuperAdminTenantSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    primaryHostname: row.primary_hostname,
    primaryAdminName: row.primary_admin_name,
    primaryAdminPhoneNumber: row.primary_admin_phone_number,
    activeMemberCount: Number(row.active_member_count),
    whatsappStatus: row.whatsapp_status,
    lastUpdatedAt: row.last_updated_at ? row.last_updated_at.toISOString() : null,
  };
}

function mapTenantDomain(row: TenantDomainRow): TenantDomain {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    hostname: row.hostname,
    kind: row.kind,
    status: row.status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapSuperAdminTenantMember(row: SuperAdminTenantMemberRow): SuperAdminTenantMember {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    personId: row.person_id,
    displayName: row.display_name,
    phoneNumber: row.phone_number,
    status: row.status,
    roles: (row.role_codes ?? []).filter(isRoleCode),
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function mapWhatsAppAccount(row: WhatsAppAccountRow): WhatsAppAccount {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    phoneNumber: row.phone_number,
    metaPhoneNumberId: row.meta_phone_number_id,
    metaBusinessAccountId: row.meta_business_account_id,
    businessName: row.business_name,
    phoneVerificationStatus: row.phone_verification_status,
    webhookSubscribed: row.webhook_subscribed,
    status: row.status,
    connectedAt: row.connected_at ? row.connected_at.toISOString() : null,
    disconnectedAt: row.disconnected_at ? row.disconnected_at.toISOString() : null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface CreateTenantForSuperAdminInput {
  name: string;
  slug: string;
  defaultContactPhone?: string | null;
  address?: string | null;
  timezone: string;
}

export async function createTenantForSuperAdmin(
  input: CreateTenantForSuperAdminInput,
  client: QueryClient = getPool(),
): Promise<Tenant> {
  const { rows } = await client.query<TenantRow>(
    `INSERT INTO tenants (name, slug, default_contact_phone, address, timezone)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.name,
      input.slug,
      input.defaultContactPhone ?? null,
      input.address ?? null,
      input.timezone,
    ],
  );
  return mapTenant(rows[0]);
}

export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  const { rows } = await getPool().query<TenantRow>("SELECT * FROM tenants WHERE id = $1", [
    tenantId,
  ]);
  return rows[0] ? mapTenant(rows[0]) : null;
}

/**
 * NOT tenant-scoped by design — used only by the daily-birthday-check and
 * event-reminder cron sweeps (app/api/cron/*), which run outside any admin
 * session and must iterate every tenant to compute "today"/"tomorrow" in
 * each tenant's own timezone.
 */
export async function listTenantIdsAndTimezones(): Promise<{ id: string; timezone: string }[]> {
  const { rows } = await getPool().query<{ id: string; timezone: string }>(
    "SELECT id, timezone FROM tenants",
  );
  return rows;
}

export async function listTenantsForSuperAdmin(): Promise<SuperAdminTenantSummary[]> {
  const { rows } = await getPool().query<SuperAdminTenantSummaryRow>(
    `SELECT t.id,
            t.slug,
            t.name,
            primary_domain.hostname AS primary_hostname,
            primary_admin.display_name AS primary_admin_name,
            primary_admin.phone_number AS primary_admin_phone_number,
            COALESCE(member_counts.active_member_count, 0) AS active_member_count,
            CASE WHEN whatsapp_account.id IS NULL THEN 'unlinked' ELSE 'linked' END AS whatsapp_status,
            GREATEST(
              t.updated_at,
              primary_domain.updated_at,
              primary_admin.updated_at,
              primary_admin.role_assigned_at,
              member_counts.latest_member_updated_at,
              whatsapp_account.updated_at
            ) AS last_updated_at
     FROM tenants t
     LEFT JOIN LATERAL (
       SELECT td.hostname, td.updated_at
       FROM tenant_domains td
       WHERE td.tenant_id = t.id AND td.kind = 'primary' AND td.status = 'active'
       ORDER BY td.created_at ASC, td.id ASC
       LIMIT 1
     ) primary_domain ON true
     LEFT JOIN LATERAL (
       SELECT tm.display_name, p.phone_number, tm.updated_at, tmr.assigned_at AS role_assigned_at
       FROM tenant_memberships tm
       INNER JOIN persons p ON p.id = tm.person_id
       INNER JOIN tenant_membership_roles tmr ON tmr.membership_id = tm.id
       INNER JOIN role_definitions rd ON rd.id = tmr.role_definition_id
       WHERE tm.tenant_id = t.id
         AND tm.status = 'active'
         AND rd.active = true
         AND rd.code = 'admin'
       ORDER BY tm.created_at ASC, tm.id ASC
       LIMIT 1
     ) primary_admin ON true
     LEFT JOIN LATERAL (
       SELECT count(*)::int AS active_member_count,
              max(tm.updated_at) AS latest_member_updated_at
       FROM tenant_memberships tm
       WHERE tm.tenant_id = t.id AND tm.status = 'active'
     ) member_counts ON true
     LEFT JOIN LATERAL (
       SELECT wa.id, wa.updated_at
       FROM whatsapp_accounts wa
       WHERE wa.tenant_id = t.id AND wa.status = 'connected'
       ORDER BY wa.connected_at DESC NULLS LAST, wa.updated_at DESC, wa.id DESC
       LIMIT 1
     ) whatsapp_account ON true
     ORDER BY t.created_at ASC, t.id ASC`,
  );
  return rows.map(mapSuperAdminTenantSummary);
}

export async function getTenantDetailForSuperAdmin(
  tenantId: string,
  client: QueryClient = getPool(),
): Promise<SuperAdminTenantDetail | null> {
  const tenantResult = await client.query<TenantRow>("SELECT * FROM tenants WHERE id = $1", [
    tenantId,
  ]);
  const tenant = tenantResult.rows[0];
  if (!tenant) return null;

  const domainResult = await client.query<TenantDomainRow>(
    `SELECT *
     FROM tenant_domains
     WHERE tenant_id = $1 AND kind = 'primary' AND status = 'active'
     ORDER BY created_at ASC, id ASC
     LIMIT 1`,
    [tenantId],
  );

  const membersResult = await client.query<SuperAdminTenantMemberRow>(
    `SELECT tm.id,
            tm.tenant_id,
            tm.person_id,
            tm.display_name,
            p.phone_number,
            tm.status,
            COALESCE(
              array_agg(rd.code ORDER BY rd.code) FILTER (WHERE rd.code IS NOT NULL),
              ARRAY[]::text[]
            ) AS role_codes,
            tm.created_at,
            tm.updated_at
     FROM tenant_memberships tm
     INNER JOIN persons p ON p.id = tm.person_id
     LEFT JOIN tenant_membership_roles tmr ON tmr.membership_id = tm.id
     LEFT JOIN role_definitions rd ON rd.id = tmr.role_definition_id AND rd.active = true
     WHERE tm.tenant_id = $1 AND tm.status = 'active'
     GROUP BY tm.id, p.phone_number
     ORDER BY
       CASE
         WHEN bool_or(rd.code = 'admin') THEN 0
         ELSE 1
       END,
       lower(tm.display_name) ASC,
       tm.id ASC`,
    [tenantId],
  );

  // Not filtered by status: whatsapp_accounts is unique per tenant, and Super
  // Admin needs to see (and manage) a disconnected account too, not just an
  // actively connected one.
  const whatsappResult = await client.query<WhatsAppAccountRow>(
    `SELECT *
     FROM whatsapp_accounts
     WHERE tenant_id = $1
     ORDER BY connected_at DESC NULLS LAST, updated_at DESC, id DESC
     LIMIT 1`,
    [tenantId],
  );

  return {
    tenant: mapTenant(tenant),
    domain: domainResult.rows[0] ? mapTenantDomain(domainResult.rows[0]) : null,
    members: membersResult.rows.map(mapSuperAdminTenantMember),
    whatsappAccount: whatsappResult.rows[0] ? mapWhatsAppAccount(whatsappResult.rows[0]) : null,
  };
}

export interface UpdateProvisionedTenantDetailsForSuperAdminInput {
  name?: string;
  defaultContactPhone?: string | null;
  address?: string | null;
  timezone?: string;
}

export async function updateProvisionedTenantDetailsForSuperAdmin(
  tenantId: string,
  fields: UpdateProvisionedTenantDetailsForSuperAdminInput,
  client: QueryClient,
): Promise<Tenant | null> {
  const { rows } = await client.query<TenantRow>(
    `UPDATE tenants
     SET name = COALESCE($2, name),
         default_contact_phone = CASE WHEN $3::boolean THEN $4 ELSE default_contact_phone END,
         address = CASE WHEN $5::boolean THEN $6 ELSE address END,
         timezone = COALESCE($7, timezone),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      tenantId,
      fields.name ?? null,
      fields.defaultContactPhone !== undefined,
      fields.defaultContactPhone ?? null,
      fields.address !== undefined,
      fields.address ?? null,
      fields.timezone ?? null,
    ],
  );
  return rows[0] ? mapTenant(rows[0]) : null;
}

export type UpdateTenantInput = Partial<
  Pick<
    Tenant,
    | "name"
    | "defaultContactPhone"
    | "address"
    | "timezone"
    | "welcomeMessage"
    | "description"
    | "history"
    | "contactEmail"
    | "googleMapsLink"
    | "morningOpen"
    | "morningClose"
    | "eveningOpen"
    | "eveningClose"
    | "donationInfo"
    | "notifyOnNewEvent"
    | "notifyOnEventUpdated"
    | "notifyOnEventCancelled"
  >
>;

/**
 * Every optional field uses a "was this actually provided" CASE-WHEN pattern
 * rather than COALESCE, so a caller can explicitly clear a field back to
 * null — required for the Chatbot Settings page, which is the first caller
 * that needs to clear e.g. welcome_message, not just set it.
 *
 * Deliberately checks `fields.x !== undefined` rather than the `"x" in
 * fields` pattern used in lib/db/events.ts/donations.ts: those repos are
 * only ever called with a `req.json()`-parsed body, where JSON serialization
 * already drops undefined-valued keys, so the two checks are equivalent
 * there. Direct object-literal callers may pass possibly-undefined values, and
 * that pattern would silently null out fields if we relied on key presence.
 * `!== undefined` handles both calling conventions correctly.
 */
export async function updateTenant(tenantId: string, fields: UpdateTenantInput): Promise<Tenant> {
  const { rows } = await getPool().query<TenantRow>(
    `UPDATE tenants
     SET name = COALESCE($2, name),
         default_contact_phone = CASE WHEN $3::boolean THEN $4 ELSE default_contact_phone END,
         address = CASE WHEN $5::boolean THEN $6 ELSE address END,
         timezone = COALESCE($7, timezone),
         welcome_message = CASE WHEN $8::boolean THEN $9 ELSE welcome_message END,
         description = CASE WHEN $10::boolean THEN $11 ELSE description END,
         history = CASE WHEN $12::boolean THEN $13 ELSE history END,
         contact_email = CASE WHEN $14::boolean THEN $15 ELSE contact_email END,
         google_maps_link = CASE WHEN $16::boolean THEN $17 ELSE google_maps_link END,
         morning_open = CASE WHEN $18::boolean THEN $19::time ELSE morning_open END,
         morning_close = CASE WHEN $20::boolean THEN $21::time ELSE morning_close END,
         evening_open = CASE WHEN $22::boolean THEN $23::time ELSE evening_open END,
         evening_close = CASE WHEN $24::boolean THEN $25::time ELSE evening_close END,
         donation_info = CASE WHEN $26::boolean THEN $27 ELSE donation_info END,
         notify_on_new_event = COALESCE($28::boolean, notify_on_new_event),
         notify_on_event_updated = COALESCE($29::boolean, notify_on_event_updated),
         notify_on_event_cancelled = COALESCE($30::boolean, notify_on_event_cancelled),
         updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [
      tenantId,
      fields.name ?? null,
      fields.defaultContactPhone !== undefined,
      fields.defaultContactPhone ?? null,
      fields.address !== undefined,
      fields.address ?? null,
      fields.timezone ?? null,
      fields.welcomeMessage !== undefined,
      fields.welcomeMessage ?? null,
      fields.description !== undefined,
      fields.description ?? null,
      fields.history !== undefined,
      fields.history ?? null,
      fields.contactEmail !== undefined,
      fields.contactEmail ?? null,
      fields.googleMapsLink !== undefined,
      fields.googleMapsLink ?? null,
      fields.morningOpen !== undefined,
      fields.morningOpen ?? null,
      fields.morningClose !== undefined,
      fields.morningClose ?? null,
      fields.eveningOpen !== undefined,
      fields.eveningOpen ?? null,
      fields.eveningClose !== undefined,
      fields.eveningClose ?? null,
      fields.donationInfo !== undefined,
      fields.donationInfo ?? null,
      fields.notifyOnNewEvent ?? null,
      fields.notifyOnEventUpdated ?? null,
      fields.notifyOnEventCancelled ?? null,
    ],
  );
  return mapTenant(rows[0]);
}

/**
 * Suspended/maintenance/archived/disabled tenants are locked out entirely —
 * see lib/auth/session.ts's getSessionAdmin (login/API/dashboard access) and
 * lib/notifications/engine.ts's enqueueNotification (WhatsApp/notifications).
 */
export async function setTenantStatus(
  tenantId: string,
  status: TenantStatus,
  superAdminId: string,
): Promise<Tenant | null> {
  const { rows: currentRows } = await getPool().query<{ status: TenantStatus }>(
    "SELECT status FROM tenants WHERE id = $1",
    [tenantId],
  );
  const previousStatus = currentRows[0]?.status ?? null;
  if (!currentRows[0]) return null;

  const { rows } = await getPool().query<TenantRow>(
    "UPDATE tenants SET status = $2, updated_at = now() WHERE id = $1 RETURNING *",
    [tenantId, status],
  );
  if (!rows[0]) return null;

  if (previousStatus !== status) {
    await createAuditLogEntry({
      actorType: "super_admin",
      actorId: superAdminId,
      tenantId,
      action: "tenant.status_changed",
      targetType: "tenant",
      targetId: tenantId,
      metadata: { oldValue: previousStatus, newValue: status },
    });
  }

  return mapTenant(rows[0]);
}
