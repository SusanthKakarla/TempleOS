# Dependency Graphs

## Authentication
`Firebase client/admin → auth API → session-token → membership/tenant repositories → protected pages/routes`

## WhatsApp
`Webhook/onboarding/templates → WhatsApp services → account/message/conversation repositories → Meta Graph API`

## Notifications
`Cron/domain event → policy + engine → templates/preferences → delivery strategy → WhatsApp client → notification/message repositories`

## Devotees, Events, Donations
`Feature UI → API route → validation → domain repository → PostgreSQL → exports/notifications where requested`

## Dashboard
`Dashboard server page → session + tenant feature gates → aggregate repositories → chart/metric components`

Generated file-level parent/child relationships are available under `02-File-Intelligence/files/`.
