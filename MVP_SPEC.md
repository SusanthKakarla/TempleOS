# TempleOS MVP Spec

## Purpose

TempleOS is a tenant-aware temple management platform. The first MVP is not the full platform. It is a narrow product-validation build for one small Indian temple run by a committee and priest, where devotees already communicate through an existing WhatsApp group.

The MVP validates whether a temple will maintain upcoming event information in a simple dashboard because devotees can reliably discover those events through a dedicated temple WhatsApp number.

## Validation Hypothesis

If a small temple has a dedicated WhatsApp Business number connected to TempleOS, then:

- temple admins will add and publish upcoming events in a lightweight dashboard;
- devotees will message the temple WhatsApp number to view upcoming events;
- the temple can use the dashboard to send event announcements to devotees who have opted in by messaging the number;
- the committee will find this easier than manually answering repeated event questions in the existing WhatsApp group.

## Target Pilot

- One small Indian temple.
- Run by committee members and a priest.
- Existing WhatsApp group already includes devotees.
- Existing group remains the community and announcement channel.
- TempleOS adds a dedicated WhatsApp Business number for structured one-on-one interactions.

## MVP Scope

### Included

- Tenant-aware architecture.
- One seeded pilot tenant.
- Tenant admin dashboard only.
- Firebase phone OTP login for tenant admins.
- Railway-hosted app.
- Railway Postgres.
- Raw SQL with repository/data-access layer.
- SQL migration files.
- Meta WhatsApp Cloud API integration.
- Manual/operator-managed WhatsApp setup.
- Guided WhatsApp menu flow.
- View upcoming events via WhatsApp.
- Contact temple option via WhatsApp.
- Devotees auto-created from inbound WhatsApp messages.
- Manual devotee add/edit in dashboard.
- Optional devotee profile fields:
  - date of birth
  - birth star / nakshatram
  - gothram / ancestral lineage
- Events CRUD.
- Publish/unpublish events.
- WhatsApp activity log.
- Manual event announcement to opted-in devotees.

### Not Included

- Super Admin dashboard.
- Self-serve temple onboarding.
- Tenant approval workflow.
- Subscription or billing.
- Public temple website/CMS.
- Seva/prayer booking.
- Event registration/RSVP.
- Payments.
- Donations.
- QR codes.
- Scheduled reminders.
- Custom broadcast messages.
- AI chatbot.
- Priest/staff/committee role dashboards.
- Volunteer workflows.
- Prasadam counter.
- Mobile app.
- Multilingual support.
- WhatsApp self-serve connection UI.

## Product Surfaces

### 1. Tenant Admin Dashboard

The dashboard is only for the pilot temple's tenant admins. It is not a platform-owner dashboard.

Sections:

- Home metrics
- Events
- Devotees
- WhatsApp Activity

### 2. WhatsApp Devotee Flow

The temple has a dedicated WhatsApp Business number. Devotees interact with that number through a guided menu.

### 3. Existing WhatsApp Group

The existing group stays in place. The committee can post a message like:

> To view upcoming temple events, message our temple WhatsApp number: [number/link]

The group is not read, parsed, or managed by TempleOS in the MVP.

## Authentication

Use Firebase Auth for tenant admin phone OTP login.

Flow:

1. Admin enters phone number.
2. Firebase sends SMS OTP.
3. Admin enters OTP.
4. Frontend receives Firebase ID token.
5. Backend verifies token using Firebase Admin SDK.
6. Backend checks the phone number against `admin_users`.
7. If active and allowlisted, admin gets access to that tenant.

Rules:

- No email login required.
- No self-signup.
- No password login.
- Only allowlisted phone numbers can access the dashboard.
- MVP role is only `tenant_admin`.

## WhatsApp Integration

Use Meta WhatsApp Cloud API directly.

MVP setup is manual/operator-managed:

- Create/configure Meta app manually.
- Configure WhatsApp Business phone number manually.
- Configure webhook URL and verify token manually.
- Store API credentials in Railway environment variables.
- Create/approve outbound message templates manually.
- Seed tenant-to-WhatsApp account mapping manually.

Dashboard only needs to show:

- WhatsApp connected status.
- Temple WhatsApp number.
- Recent inbound/outbound activity.

## WhatsApp Inbound Flow

Initial incoming message can be anything: `hi`, `namaste`, `events`, etc.

System response:

```text
Namaste. Welcome to [Temple Name].
Reply with a number:
1. View upcoming events
2. Contact temple
```

If devotee replies `1`:

```text
Upcoming events at [Temple Name]:

1. [Event Title] - [Date], [Time]
   [Short description]

2. [Event Title] - [Date], [Time]
   [Short description]

Reply "menu" to go back.
```

If no published upcoming events:

```text
There are no upcoming events published right now. Please check again later.
```

If devotee replies `2`:

```text
Please call [temple phone] or visit [temple address]. A temple volunteer may respond when available.
```

If unrecognized:

```text
Sorry, I did not understand. Reply "menu" to see options.
```

Inbound behavior:

- Resolve tenant from WhatsApp phone number ID.
- Auto-create devotee if phone number is new.
- Mark devotee as WhatsApp opted in.
- Log inbound message.
- Log outbound response.
- Record interaction type.

## WhatsApp Outbound Flow

Only one outbound action is included:

**Send event announcement**

From a published event, tenant admin clicks:

> Send WhatsApp announcement

Template-style message:

```text
Namaste. Upcoming event at [Temple Name]: [Event Title] on [Date] at [Time].
Reply "events" to view upcoming events.
```

Rules:

- Send only to devotees who have messaged the temple WhatsApp number.
- Do not send to manually added devotees unless they have opted in.
- Record one outbound message per devotee.
- Track status: queued, sent, failed, delivered if provided by webhook.
- Show sent/failed summary in dashboard.

## Admin Dashboard Scope

### Home

Metrics:

- Upcoming published events
- Total devotees
- WhatsApp opted-in devotees
- Messages received
- Messages sent
- Failed sends

### Events

Fields:

- title
- date
- start time
- optional end time
- short description
- location
- status: draft or published

Capabilities:

- list upcoming and past events
- create event
- edit event
- publish/unpublish event
- send event announcement for published event

WhatsApp only shows published upcoming events.

### Devotees

Devotees can be created in two ways:

- automatically when they message the temple WhatsApp number;
- manually by an admin.

Fields:

- WhatsApp phone number
- display name
- date of birth optional
- birth star / nakshatram optional
- gothram / ancestral lineage optional
- first seen date
- last seen date
- last interaction type
- WhatsApp opt-in status

Capabilities:

- list devotees
- search/filter devotees
- manually add devotee
- edit devotee profile
- view basic interaction metadata

Opt-in rules:

- Auto-created from inbound WhatsApp message: opted in.
- Manually added: unknown/not opted in until they message the temple number.

### WhatsApp Activity

Capabilities:

- view inbound messages
- view outbound messages
- see direction, phone number, body, status, timestamp
- see failed outbound messages

## Data Model

### tenants

- id
- name
- default_contact_phone
- address
- timezone
- created_at
- updated_at

### admin_users

- id
- tenant_id
- phone_number
- display_name
- role
- firebase_uid
- active
- created_at
- updated_at

### whatsapp_accounts

- id
- tenant_id
- phone_number
- meta_phone_number_id
- meta_business_account_id
- status
- connected_at
- created_at
- updated_at

### events

- id
- tenant_id
- title
- description
- location
- starts_at
- ends_at
- status
- created_by
- created_at
- updated_at

### devotees

- id
- tenant_id
- whatsapp_phone
- display_name
- date_of_birth
- birth_star
- ancestral_lineage
- first_seen_at
- last_seen_at
- last_interaction_type
- whatsapp_opt_in_status
- created_at
- updated_at

### whatsapp_messages

- id
- tenant_id
- devotee_id
- direction
- from_phone
- to_phone
- body
- provider_message_id
- status
- received_at
- sent_at
- created_at

### whatsapp_interactions

- id
- tenant_id
- devotee_id
- interaction_type
- metadata
- created_at

### schema_migrations

- id
- name
- applied_at

## Repository Layer

Use raw SQL, but keep SQL isolated behind repository/data-access helpers.

Example modules:

- `lib/db/pool.ts`
- `lib/db/tenants.ts`
- `lib/db/admin-users.ts`
- `lib/db/events.ts`
- `lib/db/devotees.ts`
- `lib/db/whatsapp-accounts.ts`
- `lib/db/whatsapp-messages.ts`
- `lib/db/whatsapp-interactions.ts`

Rules:

- Use parameterized SQL only.
- Do not place SQL directly in React components.
- Avoid inline SQL in route handlers where practical.
- Every tenant-owned query must include tenant scoping.
- Return typed objects from repository functions.
- Keep object shapes stable so Prisma or Drizzle can be introduced later if needed.

## Migrations

Use SQL migration files and a tiny migration runner.

Suggested structure:

- `migrations/001_initial_schema.sql`
- `migrations/002_seed_pilot_tenant.sql`
- `scripts/migrate.ts`

Migration runner behavior:

- Connect to `DATABASE_URL`.
- Create `schema_migrations` if missing.
- Read migration files in sorted order.
- Run unapplied migrations inside transactions.
- Record applied migration names.
- Fail fast on error.

## Implementation Milestones

### Milestone 1: Tenant Admin Dashboard Without Live WhatsApp

Goal: a working dashboard backed by Railway Postgres.

Scope:

- Next.js app scaffold
- Railway-ready environment config
- Postgres schema migrations
- Seed one tenant
- Seed one allowlisted admin phone number
- Firebase phone OTP login
- Backend Firebase ID token verification
- Tenant admin access check
- Dashboard home
- Events CRUD
- Devotees list/add/edit
- Tenant-scoped repository layer

Exit criteria:

- Allowlisted admin can log in with phone OTP.
- Admin can create and publish events.
- Admin can manually add/edit devotees.
- Dashboard data is scoped to the seeded tenant.

### Milestone 2: WhatsApp Inbound Event Discovery

Goal: devotees can message the temple WhatsApp number and view published upcoming events.

Scope:

- Meta webhook verification endpoint
- Inbound webhook handler
- Tenant resolution from WhatsApp phone number ID
- Inbound message logging
- Devotee auto-create
- WhatsApp opt-in marking
- Guided menu logic
- Published upcoming events response
- Contact temple response
- Unknown-message fallback
- WhatsApp Activity view

Exit criteria:

- Devotee sends message and receives menu.
- Devotee chooses events and receives published upcoming events.
- Devotee appears in dashboard.
- Messages appear in WhatsApp Activity.

### Milestone 3: Manual Event Announcement

Goal: admin can send an event announcement to opted-in devotees.

Scope:

- Send announcement action on published event
- Meta Cloud API outbound sender
- Template-style outbound message
- Send only to opted-in devotees
- Outbound message logging
- Sent/failed status tracking
- Basic delivery status handling if webhook provides it
- Dashboard send summary

Exit criteria:

- Admin sends announcement for a published event.
- Opted-in devotees receive WhatsApp message.
- Manually added non-opted-in devotees are not messaged.
- Dashboard shows sent/failed summary.

## Deployment

Use Railway for both:

- Next.js app/backend
- Postgres database

Required environment variables:

- `DATABASE_URL`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`

Exact names can change during implementation, but they should be documented in `.env.example`.

## Product Validation Metrics

Pilot length: 2-4 weeks.

Success signals:

- Temple admin creates at least 3 real events without engineering help.
- At least 30 devotees message the temple WhatsApp number.
- At least 20 devotees view upcoming events through WhatsApp.
- Admin sends at least 1 event announcement from the dashboard.
- Committee/priest says it reduces repeated event questions in WhatsApp.
- Devotees understand the guided flow without training.
- Temple asks for the next natural feature.

Likely next-feature requests:

- event registration/RSVP
- scheduled reminders
- donations
- seva/prayer booking
- custom notices
- multilingual messages

Failure signals:

- Admin does not create events.
- Devotees ignore the temple number.
- Existing WhatsApp group remains the only channel.
- Committee still manually answers event questions.
- WhatsApp setup or delivery is too unreliable.
- Dashboard feels like extra work for the temple.

## Open Questions

- Which pilot temple will be used first?
- What phone numbers should be allowlisted as tenant admins?
- What temple name, address, contact phone, and timezone should be seeded?
- Does the pilot temple already have a WhatsApp Business number, or do we need to create one?
- Which exact Meta message template will be approved for event announcements?
- Should event times be displayed in 12-hour or 24-hour format?
- What should the dashboard visual language be: plain utility or lightly branded for the temple?
