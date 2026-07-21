-- Family Relationship Management: extends the devotee module (does not
-- replace it) with a household/family concept, hooked into the existing
-- Notification Engine (migration 013). Every existing devotees row is
-- unaffected — family_id/gender/marital_status/wedding_anniversary are all
-- nullable additions.

CREATE TABLE devotee_families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  primary_devotee_id UUID REFERENCES devotees(id) ON DELETE SET NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  primary_language TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_devotee_families_tenant_id ON devotee_families(tenant_id);

-- Family members may have no mobile number (brief: "Mobile Number (Optional)"),
-- so whatsapp_phone can no longer be NOT NULL at the DB layer. Individual
-- devotee creation still requires it via the app-level Zod schema. Postgres
-- treats multiple NULLs in the existing UNIQUE(tenant_id, whatsapp_phone) as
-- non-conflicting, so no constraint change is needed for that.
ALTER TABLE devotees
  ADD COLUMN family_id UUID REFERENCES devotee_families(id) ON DELETE SET NULL,
  ADD COLUMN gender TEXT,
  ADD COLUMN marital_status TEXT,
  ADD COLUMN wedding_anniversary DATE,
  ALTER COLUMN whatsapp_phone DROP NOT NULL;
CREATE INDEX idx_devotees_family_id ON devotees(family_id) WHERE family_id IS NOT NULL;

-- relationship is plain TEXT (not CHECK-constrained), same pattern as
-- notifications.notification_type in migration 013, so new relationship
-- codes never need a future migration.
CREATE TABLE family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES devotee_families(id) ON DELETE CASCADE,
  devotee_id UUID NOT NULL REFERENCES devotees(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (family_id, devotee_id)
);
CREATE INDEX idx_family_members_family_id ON family_members(family_id);
