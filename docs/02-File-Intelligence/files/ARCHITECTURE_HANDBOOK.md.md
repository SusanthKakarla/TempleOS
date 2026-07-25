# ARCHITECTURE_HANDBOOK.md

## Basic Information

| Field | Value |
|---|---|
| Full path | `ARCHITECTURE_HANDBOOK.md` |
| Layer | Documentation |
| Category | Documentation |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Documentation in the **Documentation** area. It reads database, creates records, updates records, deletes records, calls an external api, creates or validates sessions, processes notifications/messages, uploads/processes media, returns an http response.

No statically detected named exports.

## Actions Performed

- Reads database
- Creates records
- Updates records
- Deletes records
- Calls an external API
- Creates or validates sessions
- Processes notifications/messages
- Uploads/processes media
- Returns an HTTP response

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: file-local constants or runtime/framework inputs; environment: `CRON_SECRET`.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: None detected
- External imports: None detected

## Database Usage

- Tables referenced: `tenants`, `super_admins`, `persons`, `tenant_domains`, `role_definitions`, `tenant_memberships`, `tenant_membership_roles`, `whatsapp_accounts`, `events`, `devotees`, `whatsapp_messages`, `whatsapp_interactions`, `donations`, `temple_special_days`, `temple_sevas`, `temple_faqs`, `temple_social_links`, `audit_log`, `event_notifications`, `whatsapp_conversations`, `notification_templates`, `notifications`, `notification_preferences`, `devotee_families`, `family_members`, `features`, `tenant_features`, `notification_media`, `tenant_notification_media`, `whatsapp_message_templates`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Firebase Meta/WhatsApp ImageKit

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: Runtime/schema validation detected
- Secrets: environment variables only (CRON_SECRET)
- Rate limiting: Detected

## Performance

- File size: 1431 lines; 0 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: No internal dependent detected
- Imports: No internal modules

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 7 | 8 | 8 | 8 | 7 | 8 | 7 | 8 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → ARCHITECTURE_HANDBOOK.md → output or side effect`

## Cross References

- [File Intelligence Index](../README.md)
- [API Catalog](../../06-Reference/API-Catalog.md)
- [Database Catalog](../../06-Reference/Database-Catalog.md)
