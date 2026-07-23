-- Meta's synchronous send response only confirms the message was accepted
-- into its send queue, not that it reached the device. True delivery/read/
-- failure status arrives later via an asynchronous webhook status callback,
-- keyed by the message id Meta returned at send time. This column lets that
-- later callback be joined back to the row it belongs to (same pattern as
-- the existing whatsapp_messages.provider_message_id column).
ALTER TABLE notifications ADD COLUMN provider_message_id TEXT;
CREATE INDEX idx_notifications_provider_message_id ON notifications(provider_message_id) WHERE provider_message_id IS NOT NULL;
