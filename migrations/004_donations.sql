-- Manual, record-keeping-only donation tracking. No payment processing.

CREATE TABLE donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  devotee_id UUID NOT NULL REFERENCES devotees(id),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  purpose TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'cheque', 'other')),
  notes TEXT,
  donated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_donations_tenant_donated_at ON donations(tenant_id, donated_at DESC);
CREATE INDEX idx_donations_devotee_id ON donations(devotee_id);

-- Cached on devotees (not purely derived) per spec; kept correct by
-- recomputing from donations inside the same transaction as every
-- create/update/delete (see lib/db/donations.ts), not incremental patches.
ALTER TABLE devotees
  ADD COLUMN is_donor BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN total_donated_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN last_donation_at TIMESTAMPTZ;
