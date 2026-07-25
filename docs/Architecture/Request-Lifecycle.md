# Request Lifecycle

> Source: [`ARCHITECTURE_HANDBOOK.md`](../../ARCHITECTURE_HANDBOOK.md) §3.2-3.3, expanded with additional traced flows.

## Flow 1 — Typical tenant admin page load

```mermaid
sequenceDiagram
    participant B as Browser
    participant P as Page (Server Component)
    participant G as Auth Guard (requireDashboardAdmin)
    participant S as lib/auth/session.ts
    participant D as lib/db/*
    participant PG as PostgreSQL
    B->>P: GET /dashboard/devotees (cookie: templeos_session)
    P->>G: requireDashboardAdmin()
    G->>S: requireTenantAdminSession() -> getSessionAdmin()
    S->>S: verifySignedSessionToken(cookie)
    S->>D: getTenantMembershipById(membershipId)
    D->>PG: SELECT tenant_memberships ...
    PG-->>D: membership row
    S->>D: getTenantById(tenantId)
    D->>PG: SELECT tenants ... (status check)
    S-->>G: SessionPayload or null
    alt no session
        G-->>B: redirect /login
    else session but not admin role
        G-->>B: 403 forbidden()
    else ok
        G-->>P: SessionPayload
        P->>D: listDevotees(tenantId, ...)
        D->>PG: SELECT devotees ...
        PG-->>D: rows
        D-->>P: Devotee[]
        P-->>B: rendered HTML (RSC payload)
    end
```

## Flow 2 — Mutating POST with a WhatsApp side effect (e.g. `POST /api/donations`)

```mermaid
sequenceDiagram
    participant B as Browser
    participant R as Route Handler
    participant G as requireTenantAdminSession
    participant D as lib/db/donations.ts
    participant N as lib/notifications/engine.ts
    participant A as after()
    participant W as lib/whatsapp/send-notification.ts
    B->>R: POST /api/donations {body}
    R->>G: auth + requireTenantFeatureApi("donations")
    G-->>R: session
    R->>D: createDonation() (txn — also updates devotee donor-cache columns)
    D-->>R: donation row
    R->>N: enqueueNotification(donation_thank_you) + enqueueDonationRecordedBroadcast
    N-->>R: notifications rows queued (status=queued)
    R-->>B: 201 response (fast — WhatsApp send not yet attempted)
    R->>A: after(() => processNotifications())
    A->>W: sendNotification() per queued row -> Delivery Strategy -> Meta Graph API
```

The response returns to the browser *before* the Graph API round-trip — the one deliberate exception is `POST /api/events/[id]/announce`, which awaits delivery synchronously so the UI can show a real sent/failed count.

## Flow 3 — Cron tick

```mermaid
sequenceDiagram
    participant Railway
    participant R as POST /api/cron/process-notifications
    participant Auth as isAuthorizedCronRequest
    participant D as lib/db/notifications.ts
    participant W as sendNotification()
    participant Log as logCronRun()
    Railway->>R: POST (Authorization: Bearer CRON_SECRET)
    R->>Auth: timingSafeEqual check
    Auth-->>R: authorized
    R->>D: listDueNotifications()
    D-->>R: due rows
    loop each row
        R->>W: sendNotification() -> logDeliveryOutcome()
    end
    R->>Log: logCronRun("process_notifications", counts)
```

## Flow 4 — Inbound WhatsApp webhook (synchronous, not cron)

```mermaid
sequenceDiagram
    participant Meta
    participant R as POST /api/whatsapp/webhook
    participant D as lib/db/whatsapp-messages.ts
    participant Bot as Chatbot reply logic
    participant Client as lib/whatsapp/client.ts
    Meta->>R: POST webhook payload (NO signature check)
    R->>D: logWhatsAppMessage() (txn, also upserts whatsapp_conversations)
    R->>D: upsertDevoteeFromWhatsApp()
    R->>Bot: classify command (FAQ/seva/event/special-day/social-link lookup)
    Bot->>Client: sendTextMessage/sendButtonMessage/sendListMessage
    Client->>Meta: reply, synchronously, same request
```

See [Security-Architecture.md](./Security-Architecture.md) for why Flow 4's missing signature check is the single highest-priority finding in this audit.

## Cross-references

[Authentication-Architecture.md](./Authentication-Architecture.md) · [Notification-Architecture.md](./Notification-Architecture.md) · [Cron-Architecture.md](./Cron-Architecture.md) · [WhatsApp-Architecture.md](./WhatsApp-Architecture.md)
