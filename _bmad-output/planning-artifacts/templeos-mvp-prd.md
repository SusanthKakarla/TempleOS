# TempleOS MVP Product Requirements Document

Status: Draft
Date: 2026-07-16
Source: `MVP_SPEC.md`
BMAD workflow: `bmad-prd`

## 1. Executive Summary

TempleOS MVP is a narrow product-validation release for one small Indian temple run by a committee and priest. The temple already communicates with devotees through a WhatsApp group. The MVP adds a dedicated temple WhatsApp Business number and a lightweight tenant admin dashboard so the temple can publish upcoming events and devotees can view those events through WhatsApp.

The MVP intentionally does not attempt to build the full TempleOS platform. It validates one core behavior: whether a small temple will keep event information updated in TempleOS because devotees can retrieve it through a structured WhatsApp flow.

## 2. Problem Statement

Small temples often use WhatsApp groups to announce events, answer repeated questions, and coordinate with devotees. This works when communication is informal, but it creates recurring operational problems:

- event details get buried in group chat;
- committee members repeatedly answer the same questions;
- there is no clean list of devotees who interacted with the temple;
- there is no structured way to send event announcements from an official temple number;
- devotees depend on manual replies instead of self-service event discovery.

TempleOS MVP solves the smallest useful slice of this problem: temple admins publish upcoming events, and devotees can view them through WhatsApp.

## 3. Goals

### Product Goals

- Let a temple admin create and publish upcoming temple events.
- Let devotees message the temple WhatsApp number to view upcoming events.
- Automatically create devotee records when devotees message the temple WhatsApp number.
- Let admins manually add and edit devotee profiles.
- Let admins send a manual event announcement to devotees who have opted in by messaging the temple number.
- Give admins visibility into basic WhatsApp activity.

### Validation Goals

- Prove that a small temple will maintain event data in TempleOS.
- Prove that devotees will use a dedicated temple WhatsApp number for event discovery.
- Prove that a structured WhatsApp flow reduces repeated event questions in the existing group.
- Learn the next highest-value workflow after event discovery.

## 4. Non-Goals

The MVP explicitly excludes:

- Super Admin dashboard
- self-serve temple onboarding
- subscription or billing management
- public temple website/CMS
- event registration or RSVP
- seva/prayer booking
- donations and payments
- QR codes
- scheduled reminders
- custom broadcast messages
- AI chatbot
- priest, committee, staff, or volunteer dashboards
- prasadam counter
- mobile app
- multilingual support
- WhatsApp self-serve connection UI

## 5. Target Users

### Tenant Admin

Temple committee member, priest, or trusted administrator who manages the pilot temple's events and devotee list.

Needs:

- log in using phone number OTP;
- add and publish events without technical help;
- view devotees who interacted through WhatsApp;
- manually add or update devotee information;
- send simple event announcements.

### Devotee

A temple devotee who already participates in the temple's WhatsApp group or receives temple communication through WhatsApp.

Needs:

- message the temple number;
- quickly view upcoming events;
- find contact information for the temple;
- avoid installing an app or creating an account.

### Platform Operator

The TempleOS builder/operator managing the pilot.

Needs:

- manually seed the pilot tenant;
- configure Firebase, Railway, Postgres, and Meta WhatsApp Cloud API;
- manually configure the pilot temple WhatsApp account;
- observe whether the pilot is working.

## 6. Product Scope

### Tenant Admin Dashboard

The dashboard is only for the pilot temple. It is not a Super Admin dashboard.

Sections:

- Home
- Events
- Devotees
- WhatsApp Activity

### WhatsApp Devotee Experience

The devotee messages the dedicated temple WhatsApp Business number. The system responds with a guided menu:

```text
Namaste. Welcome to [Temple Name].
Reply with a number:
1. View upcoming events
2. Contact temple
```

The flow is deterministic and menu-based. It is not an AI chatbot.

### Existing WhatsApp Group

The existing WhatsApp group remains in use. TempleOS does not read or manage the group.

The committee may use the group to drive adoption:

```text
To view upcoming temple events, message our temple WhatsApp number: [number/link]
```

## 7. User Stories

### Epic 1: Tenant Admin Access

#### Story 1.1: Admin Logs In With Phone OTP

As a tenant admin, I want to log in with my phone number, so that I can access the dashboard without needing email.

Acceptance criteria:

- Admin can enter a phone number.
- Firebase sends an OTP.
- Admin can enter OTP and authenticate.
- Backend verifies Firebase ID token.
- Backend allows access only if the phone number belongs to an active allowlisted tenant admin.
- Non-allowlisted phone numbers cannot access the dashboard.

#### Story 1.2: Admin Access Is Tenant Scoped

As a platform operator, I want admin access scoped to the pilot tenant, so that future multi-tenant support is not retrofitted later.

Acceptance criteria:

- Admin user belongs to one tenant.
- Dashboard reads and writes data only for that tenant.
- Tenant ID is enforced server-side, not trusted from client input.

### Epic 2: Event Management

#### Story 2.1: Admin Creates Event

As a tenant admin, I want to create an event, so that devotees can see it on WhatsApp.

Acceptance criteria:

- Admin can enter title, date, start time, optional end time, short description, location, and status.
- Event can be saved as draft.
- Event can be published.
- Required fields are validated.

#### Story 2.2: Admin Edits Event

As a tenant admin, I want to edit event details, so that published information stays accurate.

Acceptance criteria:

- Admin can edit existing event fields.
- Admin can publish or unpublish an event.
- Updates are reflected in the WhatsApp event list.

#### Story 2.3: WhatsApp Shows Only Published Upcoming Events

As a devotee, I want to see current upcoming events, so that I do not receive outdated or draft information.

Acceptance criteria:

- WhatsApp response includes only events with status `published`.
- WhatsApp response excludes past events.
- Events are ordered by start date/time ascending.
- If no events exist, devotee receives a clear no-events message.

### Epic 3: Devotee Management

#### Story 3.1: Devotee Is Auto-Created From WhatsApp

As a tenant admin, I want devotees to appear when they message the temple number, so that I can see who is using the channel.

Acceptance criteria:

- Inbound WhatsApp message creates a devotee if no matching phone exists.
- Existing devotee is reused if phone number already exists.
- Devotee first seen and last seen timestamps are tracked.
- Devotee is marked WhatsApp opted in.

#### Story 3.2: Admin Manually Adds Devotee

As a tenant admin, I want to manually add devotees, so that known temple devotees can be recorded before they message the temple number.

Acceptance criteria:

- Admin can add a devotee by phone number.
- Admin can add display name.
- Manually added devotees default to not opted in for WhatsApp announcements.
- Duplicate phone numbers are prevented within the tenant.

#### Story 3.3: Admin Edits Devotee Profile

As a tenant admin, I want to edit devotee details, so that the temple can maintain useful cultural and personal context.

Acceptance criteria:

- Admin can edit display name.
- Admin can edit optional date of birth.
- Admin can edit optional birth star / nakshatram.
- Admin can edit optional gothram / ancestral lineage.
- Admin can see last interaction metadata.

### Epic 4: WhatsApp Inbound Event Discovery

#### Story 4.1: Devotee Opens Menu

As a devotee, I want the temple WhatsApp number to reply with simple options, so that I know what I can do.

Acceptance criteria:

- Any initial inbound text returns the menu if no active menu selection is detected.
- Menu includes View upcoming events and Contact temple.
- Message is logged.

#### Story 4.2: Devotee Views Events

As a devotee, I want to reply with a number and view upcoming events, so that I can quickly know what is happening at the temple.

Acceptance criteria:

- Reply `1` returns upcoming published events.
- Reply `events` also returns upcoming published events.
- Response includes event title, date, time, and short description.
- Response tells devotee how to return to menu.
- Interaction is logged as `viewed_events`.

#### Story 4.3: Devotee Requests Contact Information

As a devotee, I want temple contact information, so that I can call or visit if the menu does not cover my need.

Acceptance criteria:

- Reply `2` returns temple contact phone and address.
- Interaction is logged as `requested_contact`.

#### Story 4.4: Unknown Messages Fall Back Safely

As a devotee, I want unclear messages to recover gracefully, so that I can continue without confusion.

Acceptance criteria:

- Unrecognized messages receive a fallback asking the devotee to reply `menu`.
- Unknown interaction is logged.
- System does not hallucinate answers or attempt AI Q&A.

### Epic 5: WhatsApp Outbound Event Announcement

#### Story 5.1: Admin Sends Event Announcement

As a tenant admin, I want to send an event announcement from a published event, so that opted-in devotees know about it.

Acceptance criteria:

- Send announcement action is available only for published events.
- Announcement uses template-style copy.
- Announcement is sent only to opted-in devotees.
- Manually added non-opted-in devotees are excluded.
- Dashboard shows sent and failed counts.

#### Story 5.2: System Logs Outbound Messages

As a tenant admin, I want to see outbound message status, so that I know whether announcements were sent successfully.

Acceptance criteria:

- One outbound message record is created per recipient.
- Message status is tracked as queued, sent, failed, and delivered if available.
- Failed messages are visible in WhatsApp Activity.

### Epic 6: WhatsApp Activity Visibility

#### Story 6.1: Admin Views Activity Log

As a tenant admin, I want to see inbound and outbound WhatsApp activity, so that I can understand usage and troubleshoot issues.

Acceptance criteria:

- Admin can view recent inbound messages.
- Admin can view recent outbound messages.
- Each message shows direction, phone number, body, status, and timestamp.
- Activity is tenant scoped.

## 8. Functional Requirements

### Authentication

- FR-001: The system shall support Firebase phone OTP login for tenant admins.
- FR-002: The system shall verify Firebase ID tokens server-side.
- FR-003: The system shall deny dashboard access to non-allowlisted phone numbers.
- FR-004: The system shall support only the `tenant_admin` role for MVP.

### Tenant Model

- FR-005: The system shall store tenant-owned records with `tenant_id`.
- FR-006: The system shall support one seeded pilot tenant for MVP.
- FR-007: The system shall not expose tenant creation, approval, or switching UI in MVP.

### Events

- FR-008: The system shall allow tenant admins to create, edit, publish, and unpublish events.
- FR-009: Events shall include title, description, location, start time, optional end time, and status.
- FR-010: WhatsApp event discovery shall show only published upcoming events.

### Devotees

- FR-011: The system shall auto-create devotees from inbound WhatsApp messages.
- FR-012: The system shall allow tenant admins to manually add devotees.
- FR-013: The system shall allow tenant admins to edit devotee profile fields.
- FR-014: Devotees shall include optional DOB, birth star/nakshatram, and gothram/ancestral lineage.
- FR-015: The system shall distinguish opted-in devotees from manually added non-opted-in devotees.

### WhatsApp

- FR-016: The system shall integrate with Meta WhatsApp Cloud API.
- FR-017: The system shall support webhook verification.
- FR-018: The system shall receive and log inbound WhatsApp messages.
- FR-019: The system shall send deterministic menu responses.
- FR-020: The system shall send event announcement messages only to opted-in devotees.
- FR-021: The system shall log outbound messages and statuses.

### Dashboard

- FR-022: The dashboard shall include Home, Events, Devotees, and WhatsApp Activity sections.
- FR-023: The dashboard shall show basic home metrics.
- FR-024: The dashboard shall show recent WhatsApp activity.

## 9. Non-Functional Requirements

- NFR-001: All database queries that read or write tenant-owned data must be tenant scoped.
- NFR-002: SQL must be parameterized.
- NFR-003: Raw SQL must be isolated behind repository/data-access modules.
- NFR-004: The application must be deployable on Railway.
- NFR-005: The database must run on Railway Postgres.
- NFR-006: Schema changes must be managed through SQL migration files.
- NFR-007: The webhook endpoint must respond within Meta's expected timeout window.
- NFR-008: Secrets must be provided through environment variables, not committed.
- NFR-009: The WhatsApp flow must avoid AI-generated answers in MVP.

## 10. Data Requirements

Core entities:

- tenants
- admin_users
- whatsapp_accounts
- events
- devotees
- whatsapp_messages
- whatsapp_interactions
- schema_migrations

Data principles:

- `tenant_id` is required on tenant-owned entities.
- Phone numbers should be normalized before matching.
- Manually added devotees are not considered opted in.
- Inbound WhatsApp message from a devotee marks them opted in.
- Message bodies are stored for activity/debug visibility.

## 11. UX Requirements

### Dashboard UX

- The dashboard should be utilitarian and easy for a temple committee member to operate.
- Event creation should be simple and not feel like a full CMS.
- Devotee add/edit should be clear and form-driven.
- WhatsApp Activity should be scannable and mostly read-only.
- The UI should avoid platform-owner concepts such as tenants, billing, or system settings.

### WhatsApp UX

- Messages should be short.
- The menu should be number-based.
- The system should recover from unknown input.
- The flow should not ask devotees for DOB, birth star, gothram, registration, or payment in MVP.
- The flow should work for users who are not technically sophisticated.

## 12. Technical Constraints

Chosen stack:

- Next.js
- Railway app hosting
- Railway Postgres
- Raw SQL with `pg`
- SQL migrations
- Firebase Auth phone OTP
- Firebase Admin SDK
- Meta WhatsApp Cloud API

Implementation constraints:

- No Prisma or Drizzle in MVP.
- Repository layer must keep future Prisma/Drizzle adoption feasible.
- WhatsApp setup is manual/operator-managed.
- One pilot tenant is seeded manually.
- No Super Admin dashboard.

## 13. Milestones

### Milestone 1: Tenant Admin Dashboard Without Live WhatsApp

Deliver:

- app scaffold
- Railway-ready env setup
- SQL migrations
- one seeded tenant
- one or more allowlisted admin phone numbers
- Firebase phone OTP login
- tenant admin access check
- dashboard home
- events CRUD
- devotees list/add/edit

Success criteria:

- Tenant admin can log in by phone OTP.
- Tenant admin can create and publish events.
- Tenant admin can add and edit devotees.
- Data is tenant scoped.

### Milestone 2: WhatsApp Inbound Event Discovery

Deliver:

- Meta webhook verification
- inbound message processing
- tenant resolution from WhatsApp phone number ID
- devotee auto-create
- guided menu
- event listing response
- contact temple response
- message and interaction logs
- WhatsApp Activity view

Success criteria:

- Devotee receives menu.
- Devotee can view published upcoming events.
- Devotee appears in dashboard.
- WhatsApp messages appear in activity log.

### Milestone 3: Manual Event Announcement

Deliver:

- send announcement action
- Meta outbound sender
- opted-in recipient selection
- outbound message logs
- status tracking
- dashboard send summary

Success criteria:

- Admin sends announcement for a published event.
- Only opted-in devotees receive it.
- Manual non-opted-in devotees are excluded.
- Sent/failed counts are visible.

## 14. Launch Plan

1. Configure Railway project and Postgres.
2. Configure Firebase Auth phone OTP.
3. Seed pilot tenant and allowlisted admins.
4. Build and test dashboard with sample events/devotees.
5. Configure Meta WhatsApp Cloud API manually.
6. Test webhook verification.
7. Test inbound menu flow with pilot phone numbers.
8. Ask committee to post temple WhatsApp link in existing group.
9. Observe devotee usage for 2-4 weeks.
10. Review metrics and pilot feedback.

## 15. Success Metrics

Pilot duration: 2-4 weeks.

Quantitative:

- Admin creates at least 3 real events without engineering help.
- At least 30 devotees message the temple WhatsApp number.
- At least 20 devotees view upcoming events through WhatsApp.
- Admin sends at least 1 event announcement from the dashboard.

Qualitative:

- Committee/priest says the workflow reduces repeated event questions.
- Devotees understand the WhatsApp menu without training.
- Admin does not require ongoing engineering help to keep events updated.
- Temple asks for a natural next feature.

Failure signals:

- Admin does not create events.
- Devotees ignore the temple WhatsApp number.
- Existing WhatsApp group remains the only active channel.
- Committee continues answering repeated event questions manually.
- WhatsApp setup or delivery blocks usage.
- Dashboard feels like extra work.

## 16. Risks and Mitigations

### Risk: WhatsApp Business setup takes longer than expected

Mitigation:

- Build Milestone 1 first.
- Keep WhatsApp setup manual for MVP.
- Test Meta setup before pilot launch.

### Risk: Devotees stay in existing WhatsApp group

Mitigation:

- Committee posts clear call-to-action in the group.
- WhatsApp menu gives immediate value.
- Use event announcement to reinforce the new channel.

### Risk: Admin does not maintain event data

Mitigation:

- Keep event form minimal.
- Avoid complex CMS fields.
- Measure whether admins create at least 3 events without help.

### Risk: Manually added devotees are messaged without consent

Mitigation:

- Default manually added devotees to not opted in.
- Send announcements only to inbound/opted-in devotees.

### Risk: Raw SQL becomes hard to maintain

Mitigation:

- Keep SQL in repository modules.
- Use migrations.
- Use parameterized queries only.
- Keep typed return shapes stable.

## 17. Open Questions

- Which pilot temple will be used first?
- What temple name, address, contact phone, and timezone should be seeded?
- Which phone numbers should be allowlisted as tenant admins?
- Does the pilot temple already have a WhatsApp Business number?
- What exact Meta WhatsApp message template will be approved?
- Should event times display in 12-hour or 24-hour format?
- Should the dashboard be plain utility or lightly temple-branded?

## 18. Future Candidate Features

Do not build these in MVP, but treat them as likely follow-ons if validation succeeds:

- event registration/RSVP
- scheduled event reminders
- seva/prayer booking
- donations and receipts
- richer devotee profiles
- custom announcements
- multilingual WhatsApp flows
- public temple website
- Super Admin dashboard
- self-serve temple onboarding
