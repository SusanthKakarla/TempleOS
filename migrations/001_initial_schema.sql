-- Initial schema for TempleOS forward identity reset.
-- Tenant-aware tables all carry tenant_id with an FK + index for scoped queries.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  default_contact_phone TEXT,
  address TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE CHECK (phone_number ~ '^\+[1-9][0-9]{1,14}$'),
  display_name TEXT NOT NULL,
  firebase_uid TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE persons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE CHECK (phone_number ~ '^\+[1-9][0-9]{1,14}$'),
  display_name TEXT NOT NULL,
  firebase_uid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hostname TEXT NOT NULL UNIQUE CHECK (
    length(hostname) <= 253
    AND hostname = lower(hostname)
    AND hostname ~ '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'
    AND hostname !~ '^([0-9]{1,3}\.){3}[0-9]{1,3}$'
    AND position('.' in hostname) > 1
  ),
  kind TEXT NOT NULL DEFAULT 'primary' CHECK (kind IN ('primary', 'custom')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tenant_domains_tenant_id ON tenant_domains(tenant_id);

CREATE TABLE role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  capability_set JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  person_id UUID NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (id, tenant_id),
  UNIQUE (tenant_id, person_id)
);
CREATE INDEX idx_tenant_memberships_tenant_id ON tenant_memberships(tenant_id);
CREATE INDEX idx_tenant_memberships_person_id ON tenant_memberships(person_id);

CREATE TABLE tenant_membership_roles (
  membership_id UUID NOT NULL REFERENCES tenant_memberships(id) ON DELETE CASCADE,
  role_definition_id UUID NOT NULL REFERENCES role_definitions(id) ON DELETE CASCADE,
  assigned_by_membership_id UUID REFERENCES tenant_memberships(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (membership_id, role_definition_id)
);
CREATE INDEX idx_tenant_membership_roles_role_definition_id ON tenant_membership_roles(role_definition_id);

CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  meta_phone_number_id TEXT NOT NULL UNIQUE,
  meta_business_account_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected' CHECK (status IN ('connected', 'disconnected')),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_accounts_tenant_id ON whatsapp_accounts(tenant_id);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_by, tenant_id) REFERENCES tenant_memberships(id, tenant_id) ON DELETE SET NULL
);
CREATE INDEX idx_events_tenant_id ON events(tenant_id);
CREATE INDEX idx_events_tenant_status_starts_at ON events(tenant_id, status, starts_at);

CREATE TABLE devotees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  whatsapp_phone TEXT NOT NULL,
  display_name TEXT NOT NULL,
  date_of_birth DATE,
  birth_star TEXT,
  ancestral_lineage TEXT,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_interaction_type TEXT,
  whatsapp_opt_in_status BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, whatsapp_phone)
);
CREATE INDEX idx_devotees_tenant_id ON devotees(tenant_id);

CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  devotee_id UUID REFERENCES devotees(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_phone TEXT NOT NULL,
  to_phone TEXT NOT NULL,
  body TEXT NOT NULL,
  provider_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'received' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'received')),
  received_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_messages_tenant_created ON whatsapp_messages(tenant_id, created_at DESC);
CREATE INDEX idx_whatsapp_messages_devotee_id ON whatsapp_messages(devotee_id);

CREATE TABLE whatsapp_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  devotee_id UUID REFERENCES devotees(id) ON DELETE SET NULL,
  interaction_type TEXT NOT NULL CHECK (interaction_type IN ('menu', 'viewed_events', 'requested_contact', 'unknown')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_whatsapp_interactions_tenant_created ON whatsapp_interactions(tenant_id, created_at DESC);
