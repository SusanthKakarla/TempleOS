-- Tracks the most recent successful dashboard sign-in per tenant membership,
-- for the Users table's "Last Login" column. Null means "never signed in"
-- (a pre-provisioned/invited member who hasn't activated yet via OTP).
-- Written from app/api/auth/session/route.ts's successful-login path only.

ALTER TABLE tenant_memberships ADD COLUMN last_signed_in_at TIMESTAMPTZ;
