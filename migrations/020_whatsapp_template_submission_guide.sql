-- Copy-paste-ready guidance for the admin to submit a standard template in
-- Meta Business Manager themselves (recommended name/category/language/body
-- with a {{1}},{{2}}... variable legend) — only ever populated by the
-- standard-template bootstrap, never by the manual "Add Template" dialog.
ALTER TABLE whatsapp_message_templates ADD COLUMN submission_guide TEXT;
