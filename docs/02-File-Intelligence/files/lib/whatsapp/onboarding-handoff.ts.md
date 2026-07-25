# onboarding-handoff.ts

## Basic Information

| Field | Value |
|---|---|
| Full path | `lib/whatsapp/onboarding-handoff.ts` |
| Layer | WhatsApp |
| Category | WhatsApp Service |
| Runtime | Server/build/tooling |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Safe** |

## Purpose and Responsibilities

WhatsApp Service in the **WhatsApp** area. It creates or validates sessions.

Public symbols: `OnboardingHandoffPayload`, `OnboardingResultPayload`, `createHandoffToken`, `verifyHandoffToken`, `createResultToken`, `verifyResultToken`.

## Actions Performed

- Creates or validates sessions

## Execution

- Trigger: Imported on demand by its dependents
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `@/lib/auth/session-token`.
- Outputs: exports `OnboardingHandoffPayload`, `OnboardingResultPayload`, `createHandoffToken`, `verifyHandoffToken`, `createResultToken`, `verifyResultToken`.

## Dependencies

- Internal imports: `lib/auth/session-token.ts`
- External imports: None detected

## Database Usage

- Tables referenced: None detected
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: Present; verify enforcement paths when modifying
- Tenant isolation indicators: Tenant identifier is referenced
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 77 lines; 1 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(dashboard)/dashboard/chatbot-settings/page.tsx`, `app/api/whatsapp/connect/start/route.ts`, `app/api/whatsapp/onboarding/complete/route.ts`, `app/whatsapp-onboarding/page.tsx`
- Imports: `lib/auth/session-token.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Add or update focused tests when behavior changes.
- Require review proportional to the **Safe** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 10 | 10 | 10 | 10 | 7 | 8 | 9 | 10 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → lib/whatsapp/onboarding-handoff.ts → lib/auth/session-token.ts`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
