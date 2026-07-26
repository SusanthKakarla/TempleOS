-- 021_campaigns.sql's campaigns_check assumed every non-draft campaign has a
-- template_key or custom_message set. Donation campaigns can now leave draft
-- on goal/dates/linked-purpose alone (the rich donation_campaign_broadcast
-- template is auto-generated, no admin-authored template_key/custom_message
-- required) — see lib/campaigns/donation-message.ts::isDonationCampaignReady,
-- which this constraint mirrors exactly so the DB and app-level guard never
-- drift apart.

ALTER TABLE campaigns DROP CONSTRAINT campaigns_check;
ALTER TABLE campaigns ADD CONSTRAINT campaigns_check
  CHECK (
    num_nonnulls(template_key, custom_message) >= 1
    OR status = 'draft'
    OR (
      campaign_type = 'donation'
      AND goal_amount IS NOT NULL
      AND campaign_start_date IS NOT NULL
      AND campaign_end_date IS NOT NULL
      AND linked_donation_purpose IS NOT NULL
    )
  );
