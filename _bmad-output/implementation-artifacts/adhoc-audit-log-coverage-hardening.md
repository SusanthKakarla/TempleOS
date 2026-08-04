---
baseline_commit: 74fdcd622da30991b47695e0db68ca75cf444eca
created_at: 2026-08-01
source: ad hoc BMAD create-story request after donation disappearance incident
---

# Story Ad Hoc: Audit Log Coverage Hardening

Status: ready-for-dev

## Story

As a platform operator and tenant administrator,
I want every sensitive write, destructive action, import, and export to produce a durable audit record,
so that we can investigate incidents like missing donations without guessing from side effects.

## Context

The immediate incident was missing donations. Source review found that `DELETE /api/donations/[id]` is scoped by `tenant_id` and donation `id`, so one API delete should not delete every donation. The larger problem is audit coverage: many tenant dashboard mutations and sensitive data exports do not currently write `audit_log` rows. Donation deletion is now covered by `donation.deleted`; this story extends auditability across the rest of the high-risk surfaces.

The planning artifacts already require durable audit records for privileged writes: `NFR-014: Privileged writes must produce durable audit records`. The architecture spine defines `audit_log` as the durable audit repository and maps privileged action auditability to `lib/db/audit-log.ts`.

## Scope

### In Scope

- Add missing audit records for high-risk tenant admin actions.
- Preserve existing tenant scoping and authorization behavior.
- Reuse the existing `audit_log` table and `createAuditLogEntry` helper.
- Add lightweight domain wrappers only where they reduce duplication and keep metadata consistent.
- Add tests that prove audit records are written only after successful mutations or inside the same transaction as the mutation when rollback semantics matter.
- Add an audit coverage guardrail test listing intentional exclusions.

### Out Of Scope

- New audit table schema.
- New audit UI.
- Full diff storage for every changed field.
- Logging raw exported file contents.
- Logging secrets, webhook payloads, PAN values, full donor messages, or uploaded media bytes.
- Blocking all delete operations or converting every hard delete to soft delete. That can be a follow-up story.

## Acceptance Criteria

1. Audit policy helper exists
   - Given a developer adds audit logging to a tenant action
   - When they need to write an audit row
   - Then they use the existing `createAuditLogEntry` directly or a small wrapper built on it
   - And no new audit persistence mechanism is introduced.

2. Donation lifecycle is auditable
   - Given a tenant admin creates, updates, deletes, or imports donations
   - When the operation succeeds
   - Then `audit_log` records `donation.created`, `donation.updated`, `donation.deleted`, or `donation.imported`
   - And metadata includes safe incident details such as amount, purpose, cash/non-cash type, donor source, linked payment transaction ids when available, imported/skipped/failed counts for bulk import, and changed field names for updates.

3. Exports are auditable
   - Given a tenant admin exports devotees, users, events, donations, or campaigns
   - When the export response is produced
   - Then `audit_log` records `<module>.exported`
   - And metadata includes module, export mode (`filtered` or `selected`), format, selected count or exported row count, and safe filter summary
   - And metadata does not include exported row contents.

4. Imports are auditable
   - Given a tenant admin commits a devotees, users, or donations import
   - When the import route returns success/partial success
   - Then `audit_log` records `<module>.imported`
   - And metadata includes submitted row count, imported count, skipped count, failed count, and whether partial success occurred
   - And per-row PII is not logged.

5. Devotee lifecycle is auditable
   - Given a tenant admin creates, updates, deactivates, reactivates, or imports devotees/family members
   - When the operation succeeds
   - Then `audit_log` records `devotee.created`, `devotee.updated`, `devotee.deactivated`, `devotee.reactivated`, or `devotee.imported`
   - And metadata includes target devotee/family ids, changed field names, opt-in state changes, and family move/attach summaries without dumping full profile values.

6. Event lifecycle is auditable
   - Given a tenant admin creates, updates, deletes, or manually announces an event
   - When the operation succeeds
   - Then `audit_log` records `event.created`, `event.updated`, `event.deleted`, or `event.announced`
   - And metadata includes event id, previous/new status where relevant, changed field names, and announcement recipient/sent/failed counts where available.

7. Campaign lifecycle is auditable
   - Given a tenant admin creates, updates, deletes, duplicates, sends, schedules, pauses, resumes, cancels, or archives a campaign
   - When the operation succeeds
   - Then `audit_log` records matching `campaign.*` actions
   - And metadata includes campaign id, source campaign id for duplicates, previous/new status for status transitions, and send/schedule counts where relevant.

8. Settings and catalog mutations are auditable
   - Given a tenant admin changes temple settings, notification preferences, sevas, special days, social links, or WhatsApp templates
   - When the mutation succeeds
   - Then an audit row records the action using stable action names such as `tenant_settings.updated`, `seva.created`, `special_day.deleted`, `social_link.updated`, or `whatsapp_template.deleted`
   - And metadata includes target ids/platform/template ids and changed field names only.

9. Transaction semantics are preserved
   - Given a mutation already runs in a transaction
   - When audit logging is added
   - Then the audit insert uses the same transaction client
   - And rollback removes both the data mutation and audit row.

10. Existing auth and feature gates remain unchanged
   - Given tenant dashboard APIs derive tenant context from `requireTenantAdminSession`
   - When audit logging is added
   - Then no route accepts client-supplied `tenantId`
   - And no super-admin session is accepted by tenant routes.

11. Verification passes
   - Given the story is implemented
   - When `npm run test`, `npm run typecheck`, and relevant route/service tests run
   - Then they pass
   - And any environment-only failure is documented with exact output.

## Current Audit Coverage Inventory

### Recorded Today

- Platform/admin: `super_admin.added`, `super_admin.deactivated`.
- Tenant lifecycle: `temple.provisioned`, `temple.updated`, `tenant.status_changed`.
- Tenant users/roles: `tenant_member.invited`, `tenant_member.roles_assigned`, `tenant_member.roles_changed`, `tenant_member.disabled`, `tenant_member.enabled`, `tenant_member.details_updated`, `tenant_member.deleted`.
- Feature toggles: `tenant_feature.updated`.
- WhatsApp integration/templates: connected/reconnected/disconnected/manual connect/deleted, template bootstrap/setup.
- Notification media: uploaded/deleted/linked/unlinked.
- Notifications: `notification.sent`, `notification.failed`.
- Payments: account connected/disconnected, transaction captured/failed/refunded, refund failed, reconciliation completed, token refresh failed.
- Cron: birthday check, notification processing, event notification processing, campaign schedules, template sync, payment reconciliation.
- Donations: `donation.deleted` after the current donation incident patch.

### Missing Today

- `donation.created`, `donation.updated`, `donation.imported`.
- `devotee.created`, `devotee.updated`, `devotee.deactivated`, `devotee.reactivated`, `devotee.imported`.
- `event.created`, `event.updated`, `event.deleted`, `event.announced`.
- `campaign.created`, `campaign.updated`, `campaign.deleted`, `campaign.duplicated`, `campaign.sent`, `campaign.scheduled`, `campaign.paused`, `campaign.resumed`, `campaign.cancelled`, `campaign.archived`.
- `*.exported` for devotees, users, events, donations, campaigns.
- Settings/catalog changes for tenant settings, sevas, special days, social links, notification preferences, and individual WhatsApp template create/update/delete/sync/test-send actions.

## Tasks / Subtasks

- [ ] Task 1: Define audit action policy and wrappers (AC: 1, 9, 10)
  - [ ] Keep `lib/db/audit-log.ts` as the only persistence path.
  - [ ] Add a small tenant-audit helper only if it reduces repeated actor/session boilerplate.
  - [ ] Standardize metadata conventions:
    - ids and counts are safe
    - changed field names are safe
    - raw row contents, full export contents, secrets, PAN, and webhook bodies are not safe
  - [ ] Add tests for wrapper behavior if a wrapper is introduced.

- [ ] Task 2: Audit exports first (AC: 3, 10, 11)
  - [ ] Add export audit rows to `app/api/devotees/export/route.ts`.
  - [ ] Add export audit rows to `app/api/users/export/route.ts`.
  - [ ] Add export audit rows to `app/api/events/export/route.ts`.
  - [ ] Add export audit rows to `app/api/donations/export/route.ts`.
  - [ ] Add export audit rows to `app/api/campaigns/export/route.ts`.
  - [ ] Record module, format, mode, row count, selected count when applicable, and filter keys only.

- [ ] Task 3: Audit imports (AC: 4, 10, 11)
  - [ ] Add `donation.imported` to `app/api/donations/import/commit/route.ts`.
  - [ ] Add `devotee.imported` to `app/api/devotees/import/commit/route.ts`.
  - [ ] Add `tenant_member.imported` or `user.imported` to `app/api/users/import/commit/route.ts`.
  - [ ] Include submitted/imported/skipped/failed counts and partial success flag.
  - [ ] Do not log per-row names, phones, emails, addresses, notes, or errors containing PII.

- [ ] Task 4: Complete donation audit lifecycle (AC: 2, 9, 10, 11)
  - [ ] Add `donation.created` to `app/api/donations/route.ts` or `lib/db/donations.ts`.
  - [ ] Add `donation.updated` to `app/api/donations/[id]/route.ts` or `lib/db/donations.ts`.
  - [ ] Preserve current `donation.deleted` semantics in `lib/db/donations.ts`.
  - [ ] Include linked payment transaction ids for online donations where available.
  - [ ] Add regression tests for create/update/delete audit behavior.

- [ ] Task 5: Add devotee/family audit lifecycle (AC: 5, 9, 10, 11)
  - [ ] Add `devotee.created` to `app/api/devotees/route.ts`.
  - [ ] Add `devotee.updated` to `app/api/devotees/[id]/route.ts`.
  - [ ] Add `devotee.deactivated` to `app/api/devotees/[id]/route.ts`.
  - [ ] Add `devotee.reactivated` to `app/api/devotees/[id]/status/route.ts`.
  - [ ] Add family audit rows around `app/api/devotees/families/route.ts` and `app/api/devotees/families/[id]/route.ts` if family membership changes are included in the same implementation slice.

- [ ] Task 6: Add event audit lifecycle (AC: 6, 9, 10, 11)
  - [ ] Add `event.created` to `app/api/events/route.ts`.
  - [ ] Add `event.updated` to `app/api/events/[id]/route.ts`.
  - [ ] Add `event.deleted` to `app/api/events/[id]/route.ts`.
  - [ ] Add `event.announced` to `app/api/events/[id]/announce/route.ts`.
  - [ ] Include previous/new status and announcement counts where available.

- [ ] Task 7: Add campaign audit lifecycle (AC: 7, 9, 10, 11)
  - [ ] Add `campaign.created` to `app/api/campaigns/route.ts`.
  - [ ] Add `campaign.updated` and `campaign.deleted` to `app/api/campaigns/[id]/route.ts`.
  - [ ] Add `campaign.duplicated` to `app/api/campaigns/[id]/duplicate/route.ts`.
  - [ ] Add `campaign.sent` to `app/api/campaigns/[id]/send/route.ts`.
  - [ ] Add `campaign.scheduled` to `app/api/campaigns/[id]/schedule/route.ts`.
  - [ ] Add `campaign.paused`, `campaign.resumed`, `campaign.cancelled`, and `campaign.archived` to `app/api/campaigns/[id]/status/route.ts`.
  - [ ] Do not duplicate the existing cron audit for scheduled campaign processing.

- [ ] Task 8: Add settings/catalog audit coverage (AC: 8, 10, 11)
  - [ ] Add `tenant_settings.updated` to `app/api/tenant/route.ts`.
  - [ ] Add `notification_preferences.updated` to `app/api/notification-preferences/route.ts`.
  - [ ] Add `seva.created`, `seva.updated`, `seva.deleted` to temple seva routes.
  - [ ] Add `special_day.created`, `special_day.updated`, `special_day.deleted` to special day routes.
  - [ ] Add `social_link.updated`, `social_link.deleted` to social link routes.
  - [ ] Review WhatsApp template routes and add per-template create/update/delete/sync/test-send audit rows where missing.

- [ ] Task 9: Add guardrail tests and documentation (AC: 1, 10, 11)
  - [ ] Add a test that lists mutation/export/import routes requiring audit and asserts each file contains either `createAuditLogEntry`, a domain audit wrapper, or an explicit documented exclusion.
  - [ ] Update the test when a route is intentionally excluded, with reason.
  - [ ] Keep existing tenant auth boundary tests green.
  - [ ] Run `npm run test`, targeted tests for audit wrappers/routes, and `npm run typecheck`.

## Dev Notes

### Architecture And Code Patterns

- Use `lib/db/audit-log.ts` and `createAuditLogEntry(input, client?)`; do not introduce a separate audit sink.
- `audit_log.actor_type` supports `super_admin`, `tenant_member`, and `system`.
- Tenant dashboard routes use `requireTenantAdminSession`; the actor id for tenant admin actions should be `session.membershipId`.
- Super-admin routes use the current super-admin session id as actor id.
- System actions generally use `actorType: "system"` and a stable UUID actor id such as `tenantId` where the current code already follows that pattern.
- Tenant-owned repository calls must remain scoped by `tenantId` in signatures and SQL.
- If the write is multi-step and transactional, audit with the same `client` before commit. If the transaction rolls back, the audit row must roll back too.
- If the action is not transactional today, add route-level audit after the successful repository call. Do not broaden the transaction boundary unless needed.

### Metadata Rules

- Safe metadata:
  - target ids
  - previous/new status enums
  - changed field names
  - counts
  - export format
  - filter keys or normalized filter presence flags
  - linked payment transaction ids
- Avoid:
  - full names, phone numbers, email addresses, addresses, donor notes, PAN, donor messages
  - raw uploaded file rows
  - raw exported row data
  - secrets or provider webhook bodies

### Current Files To Touch

- Core audit:
  - `lib/db/audit-log.ts`
  - optional new helper such as `lib/audit/tenant-audit.ts` or `lib/audit/actions.ts`
- Donations:
  - `app/api/donations/route.ts`
  - `app/api/donations/[id]/route.ts`
  - `app/api/donations/import/commit/route.ts`
  - `app/api/donations/export/route.ts`
  - `lib/db/donations.ts`
  - `lib/db/donations.test.ts`
- Devotees and families:
  - `app/api/devotees/route.ts`
  - `app/api/devotees/[id]/route.ts`
  - `app/api/devotees/[id]/status/route.ts`
  - `app/api/devotees/import/commit/route.ts`
  - `app/api/devotees/export/route.ts`
  - `app/api/devotees/families/route.ts`
  - `app/api/devotees/families/[id]/route.ts`
  - `lib/db/devotees.ts`
  - `lib/db/devotee-families.ts`
- Events:
  - `app/api/events/route.ts`
  - `app/api/events/[id]/route.ts`
  - `app/api/events/[id]/announce/route.ts`
  - `app/api/events/export/route.ts`
  - `lib/db/events.ts`
- Campaigns:
  - `app/api/campaigns/route.ts`
  - `app/api/campaigns/[id]/route.ts`
  - `app/api/campaigns/[id]/duplicate/route.ts`
  - `app/api/campaigns/[id]/send/route.ts`
  - `app/api/campaigns/[id]/schedule/route.ts`
  - `app/api/campaigns/[id]/status/route.ts`
  - `app/api/campaigns/export/route.ts`
  - `lib/db/campaigns.ts`
  - `lib/campaigns/run-campaign.ts`
- Users/import/export:
  - `app/api/users/import/commit/route.ts`
  - `app/api/users/export/route.ts`
  - tenant member actions already route through `lib/provisioning/tenant-members.ts`, which has audit coverage for invite/role/status/delete/detail changes.
- Settings:
  - `app/api/tenant/route.ts`
  - `app/api/notification-preferences/route.ts`
  - `app/api/temple-sevas/route.ts`
  - `app/api/temple-sevas/[id]/route.ts`
  - `app/api/temple-special-days/route.ts`
  - `app/api/temple-special-days/[id]/route.ts`
  - `app/api/temple-social-links/[platform]/route.ts`
  - `app/api/whatsapp/templates/route.ts`
  - `app/api/whatsapp/templates/[id]/route.ts`
  - `app/api/whatsapp/templates/[id]/sync/route.ts`
  - `app/api/whatsapp/templates/[id]/test-send/route.ts`

### Current Behaviors To Preserve

- Donation create still enqueues thank-you and donation-recorded notifications; audit logging must not make those sends synchronous.
- Donation import intentionally does not enqueue thank-you/broadcast notifications; audit logging must not change that.
- Event create/update automatic notifications use `after()` and generic notification queue; audit logging must not block Graph API delivery.
- Event manual announce waits for actual sent/failed counts; audit row should be written after counts are known.
- Campaign send route returns real send counts; audit row should include counts after `runCampaignNow`.
- Import routes allow partial success; audit should record partial success, not turn one failed row into full rollback.
- Export routes return files; audit should happen before returning the file response but after rows are selected so counts are known.
- Tenant auth boundary tests must continue to prove tenant APIs derive `tenantId` from session only.

### Suggested Action Names

Use stable dot names:

- `donation.created`, `donation.updated`, `donation.deleted`, `donation.imported`, `donation.exported`
- `devotee.created`, `devotee.updated`, `devotee.deactivated`, `devotee.reactivated`, `devotee.imported`, `devotee.exported`
- `family.created`, `family.updated`, `family.deleted`, `family_member.added`, `family_member.removed`
- `event.created`, `event.updated`, `event.deleted`, `event.announced`, `event.exported`
- `campaign.created`, `campaign.updated`, `campaign.deleted`, `campaign.duplicated`, `campaign.sent`, `campaign.scheduled`, `campaign.paused`, `campaign.resumed`, `campaign.cancelled`, `campaign.archived`, `campaign.exported`
- `tenant_member.imported`, `tenant_member.exported`
- `tenant_settings.updated`, `notification_preferences.updated`
- `seva.created`, `seva.updated`, `seva.deleted`
- `special_day.created`, `special_day.updated`, `special_day.deleted`
- `social_link.updated`, `social_link.deleted`
- `whatsapp_template.created`, `whatsapp_template.updated`, `whatsapp_template.deleted`, `whatsapp_template.synced`, `whatsapp_template.test_sent`

### Testing Requirements

- Add or extend route/service tests rather than relying on manual inspection.
- At minimum:
  - donation create/update/delete/import audit tests
  - export audit tests for at least one selected export and one filtered export, plus a reusable helper test if introduced
  - import audit tests for partial success
  - event/campaign status-change audit tests
  - guardrail test for route coverage
- Run:
  - `npm run test -- lib/db/donations.test.ts`
  - targeted tests for any new audit helper
  - targeted tests for modified route/service files
  - `npm run typecheck`
  - `npm run test` if the slice touches multiple modules

## Implementation Order Recommendation

1. Export/import audit first. These are high compliance value, low business-logic risk.
2. Donation create/update/import next. This closes the incident class around missing donations.
3. Devotee and event lifecycle next. These are core tenant data.
4. Campaign lifecycle next. It has many status transitions and send/schedule paths.
5. Settings/catalog surfaces last. They are important but lower incident urgency.
6. Add guardrail coverage after the first two phases so future routes cannot quietly skip audit again.

## References

- `NFR-014` in `_bmad-output/planning-artifacts/epics.md`: privileged writes must produce durable audit records.
- `AD-10` and `AD-6` in `_bmad-output/planning-artifacts/architecture/architecture-templeOS-super-admin-panel-2026-07-18/ARCHITECTURE-SPINE.md`: visible repository scoping and auditability.
- `lib/db/audit-log.ts`: existing audit persistence helper.
- `lib/payments/payment-audit.ts`: existing domain wrapper pattern.
- `lib/provisioning/tenant-members.ts`: transaction-scoped tenant-member audit pattern.
- `lib/db/donations.ts`: current transaction-scoped `donation.deleted` audit behavior.

## Completion Note

Ultimate context engine analysis completed - comprehensive developer guide created.

## Dev Agent Record

### Agent Model Used

TBD by implementation agent.

### Debug Log References

### Completion Notes List

### File List
