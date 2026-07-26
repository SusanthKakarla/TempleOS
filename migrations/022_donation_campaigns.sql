-- Donation-campaign tracking: goal/raised comparison, a fundraising date
-- range distinct from the existing send-scheduling fields, a configurable
-- donation link, and two one-shot automated triggers (closing reminder,
-- target reached) layered on the existing campaign scheduler. Additive
-- only — every existing campaign row and every non-donation campaign type
-- is unaffected (all new columns nullable, no defaults that change
-- existing behavior).
--
-- raised_amount is deliberately NOT a column here: it stays a live
-- aggregate over the donations table (see lib/db/campaign-analytics.ts's
-- getCampaignDonationSummary), exactly like every other derived campaign
-- metric — a stored counter would drift.

ALTER TABLE campaigns
  ADD COLUMN goal_amount NUMERIC,
  ADD COLUMN campaign_start_date DATE,
  ADD COLUMN campaign_end_date DATE,
  ADD COLUMN donation_link_override TEXT,
  ADD COLUMN closing_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN target_reached_announced_at TIMESTAMPTZ;
