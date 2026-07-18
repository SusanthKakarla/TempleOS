## Deferred from: code review of 2-6-provisioning-guardrail-tests (2026-07-19)

- Role-assignment unique conflicts have no dedicated stable field test [lib/provisioning/temples.test.ts:598] - pre-existing. The current review story explicitly covered tenant slug, hostname, tenant membership, tenant WhatsApp, and Meta phone-number conflicts; role-assignment duplicate behavior can be reviewed with future role-management guardrails.

## Deferred from: code review of 3-1-list-temples-for-super-admin (2026-07-19)

- Multiple active primary domains are not detected [lib/db/tenants.ts:147] - pre-existing. The current schema enforces globally unique hostnames but not one active primary domain per tenant; choosing whether to enforce a partial unique index, expose a conflict state, or handle this in temple-detail/update flows belongs in a future domain/update guardrail story.
