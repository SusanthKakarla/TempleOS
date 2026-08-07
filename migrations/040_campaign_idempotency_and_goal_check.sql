-- Campaign creation idempotency: a client-generated UUID sent once per
-- dialog-open lets the create endpoint detect and collapse duplicate
-- POSTs (fast double-clicks, retried requests) into the single winning row
-- instead of creating a second campaign. NULL for every campaign created
-- before this migration and for any caller that doesn't supply one — the
-- partial unique index only applies once a value is actually present.
ALTER TABLE campaigns ADD COLUMN client_request_id UUID;

CREATE UNIQUE INDEX campaigns_tenant_client_request_id_key
  ON campaigns (tenant_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

-- Defense-in-depth backstop for the goal amount, now mandatory at the
-- application layer (see lib/validation/campaigns.ts) — NOT NULL is
-- deliberately not added here since existing draft campaigns created before
-- this feature may already have a null goal_amount and forcing a backfill
-- decision on production data is out of scope; NULL still passes this CHECK.
ALTER TABLE campaigns ADD CONSTRAINT campaigns_goal_amount_positive
  CHECK (goal_amount IS NULL OR goal_amount > 0);
