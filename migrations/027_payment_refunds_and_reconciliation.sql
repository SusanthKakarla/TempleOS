-- Refunds and nightly reconciliation — the two genuine gaps found by
-- auditing the payment framework shipped in migration 025/026. Everything
-- else requested by this pass's spec (gateway accounts, provider configs,
-- campaign payment settings, receipts) already exists under a different
-- name or as plain columns — see docs/EL10-PAYMENT-AUDIT-AND-GAP-ANALYSIS.md.

-- One row per refund attempt (a captured payment may be partially refunded
-- more than once). provider_refund_id is set synchronously by Razorpay's
-- refund API for admin-initiated refunds, so by the time a webhook arrives
-- referencing it, a matching row almost always already exists — the
-- webhook path upserts by provider_refund_id so an externally-initiated
-- refund (issued directly in the Razorpay dashboard, bypassing TempleOS)
-- is still captured rather than silently dropped.
CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES payment_transactions(id) ON DELETE CASCADE,
  provider_refund_id TEXT UNIQUE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  reason TEXT,
  initiated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_refunds_tenant_created ON payment_refunds(tenant_id, created_at DESC);
CREATE INDEX idx_payment_refunds_transaction ON payment_refunds(transaction_id);

-- One row per nightly reconciliation run per tenant. details is a JSONB
-- array of per-transaction findings (kept lightweight — this is an
-- operational log, not a query target for anything beyond the Payment
-- Health dashboard section, which only reads the single latest row).
CREATE TABLE payment_reconciliation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  transactions_checked INT NOT NULL DEFAULT 0,
  mismatches_found INT NOT NULL DEFAULT 0,
  auto_resolved INT NOT NULL DEFAULT 0,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_reconciliation_logs_tenant_created ON payment_reconciliation_logs(tenant_id, created_at DESC);
