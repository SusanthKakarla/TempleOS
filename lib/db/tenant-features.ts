import { getPool } from "./pool";
import type { QueryClient } from "./query-client";
import { createAuditLogEntry } from "./audit-log";
import type { Feature, FeatureKey, TenantFeature } from "@/types/db";

interface TenantFeatureRow {
  id: string;
  tenant_id: string;
  feature_key: string;
  enabled: boolean;
  enabled_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapTenantFeature(row: TenantFeatureRow): TenantFeature {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    featureKey: row.feature_key as FeatureKey,
    enabled: row.enabled,
    enabledBy: row.enabled_by,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

export interface TenantFeatureWithCatalog extends Feature {
  enabled: boolean;
}

/**
 * Full catalog LEFT JOINed against this tenant's rows — a feature the
 * catalog gained after this tenant was provisioned has no tenant_features
 * row yet, so it falls back to the catalog's own default_enabled rather
 * than silently disappearing.
 */
export async function listTenantFeatures(tenantId: string): Promise<TenantFeatureWithCatalog[]> {
  const { rows } = await getPool().query<{
    id: string;
    key: string;
    display_name: string;
    description: string | null;
    icon: string | null;
    category: Feature["category"];
    is_core: boolean;
    default_enabled: boolean;
    depends_on: string[];
    sort_order: number;
    created_at: Date;
    updated_at: Date;
    enabled: boolean | null;
  }>(
    `SELECT f.*, tf.enabled
     FROM features f
     LEFT JOIN tenant_features tf ON tf.feature_key = f.key AND tf.tenant_id = $1
     ORDER BY f.sort_order ASC, f.key ASC`,
    [tenantId],
  );
  return rows.map((row) => ({
    id: row.id,
    key: row.key as FeatureKey,
    displayName: row.display_name,
    description: row.description,
    icon: row.icon,
    category: row.category,
    isCore: row.is_core,
    defaultEnabled: row.default_enabled,
    dependsOn: row.depends_on as FeatureKey[],
    sortOrder: row.sort_order,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    enabled: row.enabled ?? row.default_enabled,
  }));
}

/** The hot-path check used by lib/auth/features.ts's requireTenantFeature. */
export async function isFeatureEnabled(tenantId: string, featureKey: FeatureKey): Promise<boolean> {
  const { rows } = await getPool().query<{ enabled: boolean | null; default_enabled: boolean }>(
    `SELECT tf.enabled, f.default_enabled
     FROM features f
     LEFT JOIN tenant_features tf ON tf.feature_key = f.key AND tf.tenant_id = $2
     WHERE f.key = $1`,
    [featureKey, tenantId],
  );
  if (rows.length === 0) return false; // unknown feature key — fail closed
  return rows[0].enabled ?? rows[0].default_enabled;
}

export class TenantFeatureError extends Error {
  constructor(
    message: string,
    public readonly code: "FEATURE_NOT_FOUND" | "FEATURE_IS_CORE",
  ) {
    super(message);
    this.name = "TenantFeatureError";
  }
}

/** Upserts one tenant's flag for one feature and audit-logs the change. Rejects core features (always on). */
export async function setTenantFeature(
  tenantId: string,
  featureKey: FeatureKey,
  enabled: boolean,
  superAdminId: string,
): Promise<TenantFeature> {
  const { rows: featureRows } = await getPool().query<{ is_core: boolean }>(
    "SELECT is_core FROM features WHERE key = $1",
    [featureKey],
  );
  const feature = featureRows[0];
  if (!feature) {
    throw new TenantFeatureError(`Unknown feature key: ${featureKey}`, "FEATURE_NOT_FOUND");
  }
  if (feature.is_core) {
    throw new TenantFeatureError("Core features cannot be disabled.", "FEATURE_IS_CORE");
  }

  const { rows: previousRows } = await getPool().query<{ enabled: boolean }>(
    "SELECT enabled FROM tenant_features WHERE tenant_id = $1 AND feature_key = $2",
    [tenantId, featureKey],
  );
  const previousEnabled = previousRows[0]?.enabled ?? null;

  const { rows } = await getPool().query<TenantFeatureRow>(
    `INSERT INTO tenant_features (tenant_id, feature_key, enabled, enabled_by)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (tenant_id, feature_key)
     DO UPDATE SET enabled = EXCLUDED.enabled, enabled_by = EXCLUDED.enabled_by, updated_at = now()
     RETURNING *`,
    [tenantId, featureKey, enabled, superAdminId],
  );

  await createAuditLogEntry({
    actorType: "super_admin",
    actorId: superAdminId,
    tenantId,
    action: "tenant_feature.updated",
    targetType: "tenant_feature",
    targetId: featureKey,
    metadata: { featureKey, oldValue: previousEnabled, newValue: enabled },
  });

  return mapTenantFeature(rows[0]);
}

/**
 * Used inside provisionTemple's transaction — one row per catalog feature.
 * Core features are always enabled; coming_soon features are always
 * disabled regardless of what the client submitted (the wizard's checkboxes
 * for them are disabled too, but this is the real enforcement point).
 * `selectedKeys: null` (rather than an explicit array) falls back to each
 * feature's own default_enabled — used by any future caller that doesn't
 * go through the wizard's Step 5.
 */
export async function initializeTenantFeatures(
  tenantId: string,
  selectedKeys: FeatureKey[] | null,
  client: QueryClient,
): Promise<void> {
  const { rows: catalog } = await client.query<{
    key: string;
    is_core: boolean;
    category: Feature["category"];
    default_enabled: boolean;
  }>("SELECT key, is_core, category, default_enabled FROM features");
  const selected = selectedKeys ? new Set(selectedKeys) : null;

  for (const feature of catalog) {
    const wanted = selected ? selected.has(feature.key as FeatureKey) : feature.default_enabled;
    const enabled = feature.is_core || (feature.category !== "coming_soon" && wanted);
    await client.query(
      `INSERT INTO tenant_features (tenant_id, feature_key, enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (tenant_id, feature_key) DO NOTHING`,
      [tenantId, feature.key, enabled],
    );
  }
}
