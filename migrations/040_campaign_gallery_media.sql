-- Optional gallery images for a donation campaign (before/after renovation
-- shots, festival photos, annadanam photos) shown on the public donation
-- page beneath the story.
--
-- A join table rather than a UUID[] column on campaigns, so the existing
-- notification_media row stays the single source of truth for every uploaded
-- image (URL, dimensions, storage key, ImageKit cleanup) exactly as
-- campaigns.banner_media_id and events.banner_media_id already do. Deleting
-- an image or a campaign cleans up the link automatically; no orphan ids can
-- accumulate in an array nobody validates.
CREATE TABLE campaign_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES notification_media(id) ON DELETE CASCADE,
  -- Admin-controlled display order. Not a timestamp sort: reordering the
  -- gallery must not require re-uploading.
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, media_id)
);

CREATE INDEX idx_campaign_media_campaign ON campaign_media(campaign_id, position);
