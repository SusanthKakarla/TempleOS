# sidebar.tsx

## Basic Information

| Field | Value |
|---|---|
| Full path | `components/ui/sidebar.tsx` |
| Layer | Presentation |
| Category | Shared UI Component |
| Runtime | Client |
| Status | Active/entry-point |
| Owner | Unassigned (no CODEOWNERS file) |
| Modification risk | **Low** |

## Purpose and Responsibilities

Shared UI Component in the **Presentation** area. It reads database.

No statically detected named exports.

## Actions Performed

- Reads database

## Execution

- Trigger: React rendering or client interaction
- HTTP methods: None

## Inputs and Outputs

- Inputs: imports from `react`, `@base-ui/react/merge-props`, `@base-ui/react/use-render`, `class-variance-authority`, `@/hooks/use-mobile`, `@/lib/utils`, `@/components/ui/button`, `@/components/ui/input`, `@/components/ui/separator`, `@/components/ui/sheet`, `@/components/ui/skeleton`, `@/components/ui/tooltip`, `lucide-react`.
- Outputs: side effects or static artifact.

## Dependencies

- Internal imports: `hooks/use-mobile.ts`, `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/separator.tsx`, `components/ui/sheet.tsx`, `components/ui/skeleton.tsx`, `components/ui/tooltip.tsx`
- External imports: `react`, `@base-ui/react/merge-props`, `@base-ui/react/use-render`, `class-variance-authority`, `lucide-react`

## Database Usage

- Tables referenced: `events`
- Transactions/constraints: inspect linked migration or repository documents before changing persistence behavior.

## API and Integration Usage

- Route methods: Not an API route
- External integration indicators: None detected

## Security

- Authentication/authorization indicators: None detected in this file
- Tenant isolation indicators: No tenant identifier detected
- Validation indicators: No validation marker detected
- Secrets: none detected
- Rate limiting: Not implemented locally

## Performance

- File size: 736 lines; 8 internal dependencies.
- Review database calls inside loops, unbounded list queries, and external calls when changing this file.

## Relationships

- Imported by: `features/dashboard/app-sidebar.tsx`, `features/dashboard/bottom-nav-bar.tsx`, `features/dashboard/dashboard-shell.tsx`, `features/dashboard/dashboard-topbar.tsx`, `features/super-admin/super-admin-shell.tsx`, `features/super-admin/super-admin-sidebar.tsx`, `features/super-admin/super-admin-topbar.tsx`
- Imports: `hooks/use-mobile.ts`, `lib/utils.ts`, `components/ui/button.tsx`, `components/ui/input.tsx`, `components/ui/separator.tsx`, `components/ui/sheet.tsx`, `components/ui/skeleton.tsx`, `components/ui/tooltip.tsx`

## Used or Dead

**Active/entry-point.** Static import analysis cannot prove runtime reachability for framework-discovered routes, pages, scripts, migrations, or assets.

## Improvement Suggestions

- Consider splitting this file by responsibility; it exceeds 400 lines.
- Add or update focused tests when behavior changes.
- Require review proportional to the **Low** modification risk.

## File Health Score

| Maintainability | Complexity | Readability | Performance | Security | Testability | Documentation | Reusability | Overall |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 7 | 8 | 8 | 8 | 7 | 8 | 9 | 8 |

Scores are static-analysis guidance, not runtime measurements.

## Visual Flow

`Runtime/framework → components/ui/sidebar.tsx → hooks/use-mobile.ts / lib/utils.ts / components/ui/button.tsx / components/ui/input.tsx`

## Cross References

- [File Intelligence Index](../../../README.md)
- [API Catalog](../../../../06-Reference/API-Catalog.md)
- [Database Catalog](../../../../06-Reference/Database-Catalog.md)
