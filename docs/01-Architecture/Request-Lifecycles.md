# Request Lifecycles

## Tenant Login

`Login form → Firebase phone OTP → ID token → /api/auth/session → tenant host lookup → person + membership validation → signed HTTP-only session cookie → dashboard authorization`

## Create or Update Domain Record

`Feature form → client validation → API request → getSessionAdmin → role/feature authorization → Zod validation → tenant-scoped repository → PostgreSQL → JSON response → UI refresh`

## Birthday Notification

`Railway cron → CRON_SECRET verification → birthday candidate query → notification engine/template resolution → conversation/delivery strategy → Meta Graph API → delivery record → webhook status update`

## WhatsApp Inbound Message

`Meta webhook → phone-number account lookup → tenant derivation → devotee upsert → command router → tenant content query → localized response → Meta send → message/interaction log`

## Super-admin Temple Provisioning

`Super-admin session → validated request/form → provisioning transaction → tenant + domain + person + membership + roles/features → audit record → response`
