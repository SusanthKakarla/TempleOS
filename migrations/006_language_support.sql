-- WhatsApp chatbot Telugu language support. Only the bot's own chrome (menu
-- labels, headers, fallback strings) is localized via lib/whatsapp/i18n.ts --
-- admin-authored CMS content (events, sevas, FAQ, history, donation info) is
-- never machine-translated and renders exactly as the admin typed it.

ALTER TABLE tenants ADD COLUMN donation_info TEXT;

ALTER TABLE devotees ADD COLUMN preferred_language TEXT
  CHECK (preferred_language IN ('en', 'te'));

ALTER TABLE whatsapp_interactions DROP CONSTRAINT whatsapp_interactions_interaction_type_check;
ALTER TABLE whatsapp_interactions ADD CONSTRAINT whatsapp_interactions_interaction_type_check
  CHECK (interaction_type IN ('menu','viewed_events','requested_contact','unknown',
                               'viewed_timings','viewed_history','viewed_sevas','viewed_faq',
                               'selected_language','requested_language_change',
                               'viewed_donation_info','viewed_help'));
