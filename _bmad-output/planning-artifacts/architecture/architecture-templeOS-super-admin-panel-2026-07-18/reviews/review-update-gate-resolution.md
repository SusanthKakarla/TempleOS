# Update Reviewer Gate Resolution

Verdict: Passed after targeted fixes.

Resolved findings:

1. Target-state language could be mistaken for current checkout reality.
   - Fixed by adding `Current Checkout Baseline` before the design paradigm and labeling the diagram as target architecture.

2. `admin_users` migration was not deterministic.
   - Fixed by AD-16: active legacy `super_admin` and `admin` both backfill into forward `admin` membership role before subdomain login is enabled.

3. Login source of truth during cutover was ambiguous.
   - Fixed by AD-16: new subdomain login is membership-only after backfill and does not consult `admin_users`.

4. Person creation from admins and devotees could fork.
   - Fixed by AD-17: required initial `persons` backfill comes from active `admin_users` and explicit provisioning; WhatsApp-only devotees link opportunistically.

5. Role bootstrap lacked exact rows and capability meaning.
   - Fixed by AD-18: V0 role definitions and capability meaning are fixed.

6. Subdomain hostname storage and non-production handling were under-specified.
   - Fixed by AD-19: `tenant_domains.hostname` stores full normalized hostnames; apex/generic hosts do not create tenant sessions; local override is development-only.

Remaining intentional deferrals:

- Tenant-local custom role definitions.
- Custom domains.
- Generic `templeos.com` tenant picker.
- Tenant deletion/restore.
- Tenant impersonation.
- Billing/subscriptions.
- Meta embedded signup.
