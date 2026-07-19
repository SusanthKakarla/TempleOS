## Deferred from: code review of 2-6-provisioning-guardrail-tests (2026-07-19)

- Role-assignment unique conflicts have no dedicated stable field test [lib/provisioning/temples.test.ts:598] - pre-existing. The current review story explicitly covered tenant slug, hostname, tenant membership, tenant WhatsApp, and Meta phone-number conflicts; role-assignment duplicate behavior can be reviewed with future role-management guardrails.

## Deferred from: code review of 3-1-list-temples-for-super-admin (2026-07-19)

- Multiple active primary domains are not detected [lib/db/tenants.ts:147] - pre-existing. The current schema enforces globally unique hostnames but not one active primary domain per tenant; choosing whether to enforce a partial unique index, expose a conflict state, or handle this in temple-detail/update flows belongs in a future domain/update guardrail story.

## Deferred from: Epic 3 scope cut (2026-07-19)

- Story 3.6, "Show WhatsApp Linkage Status Shell", is deferred for now. Active Epic 3 work should not create linked/unlinked WhatsApp status UI, status-shell APIs, update controls, disconnect/transfer flows, or embedded signup. Optional WhatsApp data captured during Epic 2 provisioning can remain stored, but no new Super Admin WhatsApp status surface should be added until this story is explicitly re-scoped.
