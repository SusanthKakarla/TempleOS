-- Super Admin provisioning transaction support.
-- Adds the tenant slug required by the canonical provisioning contract and
-- the durable audit log required for privileged writes.

ALTER TABLE tenants
  ADD COLUMN slug TEXT;

WITH normalized_tenants AS (
  SELECT
    id,
    COALESCE(
      NULLIF(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''),
      'tenant'
    ) AS base_slug
  FROM tenants
)
UPDATE tenants
SET slug = left(normalized_tenants.base_slug, 54) || '-' || substr(tenants.id::text, 1, 8)
FROM normalized_tenants
WHERE tenants.id = normalized_tenants.id;

ALTER TABLE tenants
  ALTER COLUMN slug SET NOT NULL,
  ADD CONSTRAINT tenants_slug_unique UNIQUE (slug),
  ADD CONSTRAINT tenants_slug_format_check CHECK (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$');

WITH ranked_whatsapp_accounts AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY connected_at DESC NULLS LAST, updated_at DESC, created_at DESC, id DESC) AS row_number
  FROM whatsapp_accounts
)
DELETE FROM whatsapp_accounts
USING ranked_whatsapp_accounts
WHERE whatsapp_accounts.id = ranked_whatsapp_accounts.id
  AND ranked_whatsapp_accounts.row_number > 1;

ALTER TABLE whatsapp_accounts
  ADD CONSTRAINT whatsapp_accounts_tenant_id_unique UNIQUE (tenant_id);

CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('super_admin', 'tenant_member')),
  actor_id UUID NOT NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_log_tenant_created ON audit_log(tenant_id, created_at DESC);
CREATE INDEX idx_audit_log_actor_created ON audit_log(actor_type, actor_id, created_at DESC);
