-- Campaign module: broadcast messaging campaigns (donation drives, festival
-- greetings, birthday/event reminders, membership renewals) built entirely
-- on top of the existing notification engine — a campaign is a labeled,
-- schedulable batch definition whose actual fan-out rides the same
-- notifications table/delivery engine every other notification type
-- already uses. See campaigns.status for the lifecycle; recurrence and
-- one-time sends are both driven by next_run_at, checked by a dedicated
-- cron sweep (app/api/cron/process-campaign-schedules).
--
-- audience_filter, notification_type, and category are plain
-- TEXT/JSONB (no CHECK) for the same reason notification_type/category on
-- notifications itself have none: new campaign types/audience shapes should
-- never require a migration.

CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  campaign_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'running', 'paused', 'completed', 'archived', 'cancelled')),
  channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (channel IN ('in_app', 'whatsapp')),
  template_key TEXT,
  custom_message TEXT,
  audience_filter JSONB NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  banner_media_id UUID REFERENCES notification_media(id) ON DELETE SET NULL,
  linked_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
  linked_donation_purpose TEXT,
  schedule_type TEXT NOT NULL DEFAULT 'one_time' CHECK (schedule_type IN ('one_time', 'recurring')),
  scheduled_at TIMESTAMPTZ,
  recurrence_rule TEXT,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (created_by, tenant_id) REFERENCES tenant_memberships(id, tenant_id) ON DELETE SET NULL,
  CHECK (num_nonnulls(template_key, custom_message) >= 1 OR status = 'draft')
);

CREATE INDEX idx_campaigns_tenant_status ON campaigns(tenant_id, status);
CREATE INDEX idx_campaigns_tenant_created ON campaigns(tenant_id, created_at DESC);
CREATE INDEX idx_campaigns_due ON campaigns(next_run_at) WHERE status = 'scheduled' AND next_run_at IS NOT NULL;

-- The single tag that lets every notification fan-out row created by a
-- campaign be traced back to it and aggregated for analytics, without a
-- second delivery-tracking table. Nullable — every notification created
-- outside the Campaign module (birthdays, event reminders, etc.) leaves
-- this null and is completely unaffected.
ALTER TABLE notifications ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;
CREATE INDEX idx_notifications_campaign ON notifications(campaign_id) WHERE campaign_id IS NOT NULL;

-- One new media category, added the same way 013 widened audit_log's
-- actor_type CHECK: drop and recreate the constraint rather than a native
-- enum, so the media table's category list stays a single source of truth.
ALTER TABLE notification_media DROP CONSTRAINT notification_media_category_check;
ALTER TABLE notification_media ADD CONSTRAINT notification_media_category_check
  CHECK (category IN
    ('event_banner', 'birthday_greeting', 'anniversary_greeting', 'donation_thank_you', 'festival_greeting', 'campaign_banner'));
