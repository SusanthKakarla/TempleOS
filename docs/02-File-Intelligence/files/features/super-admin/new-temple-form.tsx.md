# new-temple-form.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `features/super-admin/new-temple-form.tsx` |
| Layer | Super Admin |
| Category | Feature Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **High** |

## Purpose and Responsibilities

Feature Component in the **Super Admin** area. It calls an external api, uploads/processes media.

Public symbols: `NewTempleForm`.

## Actions Performed

- Calls an external API
- Uploads/processes media

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `framer-motion`, `lucide-react`, `@/components/ui/badge`, `@/components/ui/button`, `@/components/ui/card`, `@/components/ui/label`, `@/components/ui/checkbox`, `@/components/ui/labeled-input`, `@/components/ui/textarea`, `@/lib/utils`, `@/lib/motion`, `./new-temple-form-helpers`, `@/types/db`.
- Outputs: exports `NewTempleForm`.

## Dependencies

- Internal imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/label.tsx`, `components/ui/checkbox.tsx`, `components/ui/labeled-input.tsx`, `components/ui/textarea.tsx`, `lib/utils.ts`, `lib/motion.ts`, `features/super-admin/new-temple-form-helpers.ts`, `types/db.ts`
- External imports: `react`, `framer-motion`, `lucide-react`

## Database Usage

- Tables referenced: `features`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: Meta/WhatsApp 

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 582 lines; 11 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `app/(super-admin)/super-admin/(shell)/temples/new/page.tsx`
- Imports: `components/ui/badge.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/label.tsx`, `components/ui/checkbox.tsx`, `components/ui/labeled-input.tsx`, `components/ui/textarea.tsx`, `lib/utils.ts`, `lib/motion.ts`, `features/super-admin/new-temple-form-helpers.ts`, `types/db.ts`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **High** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 7 | 8 | 8 | 8 | 7 | 8 | 7 | 8 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → features/super-admin/new-temple-form.tsx → components/ui/badge.tsx / components/ui/button.tsx / components/ui/card.tsx / components/ui/label.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
