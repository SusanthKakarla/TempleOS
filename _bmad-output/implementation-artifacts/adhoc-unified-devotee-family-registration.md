---
baseline_commit: b08342389b5b6a7682273056e49e7fdf5e76dca5
---

# Story Ad Hoc: Unified Devotee And Family Registration

Status: in-progress

## Story

As a tenant admin,
I want one Add Devotee flow that can optionally place the devotee into a family and add/search family members,
so that adding individuals and families is one clear workflow without duplicating devotee records or leaving family links inconsistent.

## Scope Clarification

- "User" in this story means tenant devotee/person in the Devotees module, not dashboard staff users under `features/users`.
- When an existing devotee is added to a family, that devotee's family details must update immediately and consistently:
  - `devotees.family_id` points to the selected/new family.
  - `family_members` contains exactly one row for that devotee in that family with the selected relationship.
  - Any previous family-member link for that devotee is removed in the same transaction if a move is confirmed.
  - list/detail views show the new `familyName` and `relationship` via existing `lib/db/devotees.ts` joins.
- No database schema migration is expected. This is a service/API/UI contract change over the existing family tables.
- Village deployments commonly have many households sharing the same surname/family label. `familyName` must be treated as a loose display label, not a unique identifier. Family selection must disambiguate with head/member/contact/location context.

## Acceptance Criteria

1. Unified add entry
   - Given a tenant admin clicks Add from the Devotees page
   - When the dialog opens
   - Then it opens directly to devotee details and does not ask the old "individual vs family" choice first.

2. No-family path preserves current behavior
   - Given the Family section is left as No family
   - When the admin saves a valid new devotee
   - Then the system creates one tenant-scoped devotee with `family_id = NULL`
   - And phone normalization, duplicate phone handling, and WhatsApp opt-in defaults remain compatible with the existing individual create path.

3. Add to existing family
   - Given the admin chooses Add to existing family
   - When they select a family and a relationship for the new devotee
   - Then save creates the devotee and links it to the selected family in one transaction
   - And `devotees.family_id` and `family_members.relationship` are both persisted.

4. Create new family with primary devotee
   - Given the admin chooses Create new family
   - When they enter family details and save
   - Then the newly created devotee becomes a member of that family
   - And the family has exactly one Head of Family.

5. Search and attach existing devotees as family members
   - Given the admin is creating or editing the family portion of the add flow
   - When they search existing devotees
   - Then results come from the session tenant only
   - And selecting an existing devotee attaches that existing row instead of creating a duplicate.

6. Existing devotee family details update on attach
   - Given an existing devotee is selected as a family member
   - When the admin saves the flow
   - Then the existing devotee's `devotees.family_id` is updated to the target family
   - And the corresponding `family_members` row is inserted or updated with the selected relationship
   - And `getDevoteeById` / list devotees return the new family name and relationship.

7. Existing devotee move semantics are explicit
   - Given a selected existing devotee already belongs to another family
   - When the admin attempts to attach them to the target family
   - Then the UI shows their current family before save
   - And the backend requires an explicit move flag/intent before removing the old family link
   - And without that explicit move intent, the API returns a conflict response rather than silently moving them.

8. Exactly one head is enforced
   - Given the submitted family payload has zero or multiple `head_of_family` relationships
   - When the API validates the request
   - Then it returns 400 and no devotee/family/member writes are committed.

9. Tenant boundary
   - Given a request includes IDs for devotees or families outside the session tenant
   - When the API processes the request
   - Then it rejects the request and does not attach or expose cross-tenant records.

10. Existing family edit remains compatible
   - Given a tenant admin opens the existing family edit page
   - When they update family members
   - Then existing behavior still works, including unlinking removed members without deleting devotee history.

11. Mobile and desktop UX
   - Given the admin uses the add flow on mobile or desktop
   - When they expand the Family section and add/search members
   - Then the form remains scrollable, compact, and does not nest large cards inside cards.

12. Verification
   - Given the story is complete
   - When `npm run test`, `npm run typecheck`, and `npm run lint` are run
   - Then all pass, or any environment-only failure is documented with exact output.

13. Same-name family disambiguation
   - Given a village has multiple families with the same surname or family label
   - When the admin searches for an existing family
   - Then results show family name plus head of family, location/address, phone, and member count where available
   - And search matches family name, head name, member name, phone, city/address/state, and PIN code
   - And creating a new family with similar known details shows a soft warning without blocking save.

## Technical Plan

### Backend Contract

Create a new composite registration route instead of overloading the existing simple route:

- New route: `app/api/devotees/registration/route.ts`
- New validation module or schema export: `lib/validation/devotee-registration.ts`
- New transaction service: either `lib/db/devotee-registration.ts` or a carefully named addition to `lib/db/devotee-families.ts`

Proposed payload:

```ts
type DevoteeRegistrationPayload = {
  devotee: {
    displayName: string;
    whatsappPhone: string;
    whatsappOptInStatus?: boolean;
    dateOfBirth?: string | null;
    birthStar?: string | null;
    ancestralLineage?: string | null;
    gender?: Gender | null;
    maritalStatus?: MaritalStatus | null;
    weddingAnniversary?: string | null;
  };
  family:
    | { mode: "none" }
    | {
        mode: "existing";
        familyId: string;
        relationship: RelationshipCode;
      }
    | {
        mode: "new";
        familyName: string;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        pincode?: string | null;
        primaryLanguage?: SupportedLanguage | null;
        primaryRelationship: RelationshipCode;
        members: Array<
          | {
              kind: "existing";
              devoteeId: string;
              relationship: RelationshipCode;
              moveFromExistingFamily?: boolean;
            }
          | {
              kind: "new";
              displayName: string;
              whatsappPhone?: string | null;
              relationship: RelationshipCode;
              gender?: Gender | null;
              maritalStatus?: MaritalStatus | null;
              dateOfBirth?: string | null;
              weddingAnniversary?: string | null;
              birthStar?: string | null;
              ancestralLineage?: string | null;
            }
        >;
      };
};
```

Notes:
- For `family.mode = "existing"`, the primary newly-created devotee is attached to an existing family.
- For `family.mode = "new"`, the primary newly-created devotee must be included in the head-count calculation via `primaryRelationship`.
- Existing member selections must use `devoteeId`; do not copy profile fields into a new row.
- If any existing selected devotee already has `family_id` and `moveFromExistingFamily !== true`, return 409 with enough detail for the UI to show the conflict.

### Required Transaction Behavior

The transaction service must:

1. Normalize all phone numbers before insert/update.
2. Create the primary devotee.
3. Create or load the target family.
4. Attach the primary devotee by writing both:
   - `devotees.family_id`
   - `family_members(family_id, devotee_id, relationship, is_primary)`
5. For existing selected devotees:
   - Verify `tenant_id` matches the session tenant.
   - If moving, delete their old `family_members` row and update old family `primary_devotee_id` if needed.
   - Update `devotees.family_id` to the target family.
   - Insert or update the target `family_members` row.
6. Set `devotee_families.primary_devotee_id` to the one `head_of_family`.
7. Roll back everything on validation, duplicate phone, cross-tenant, or head-count failures.

Do not use `updateDevotee()` alone for family assignment. It updates `devotees.family_id`, but it does not maintain the `family_members` relationship row.

### UI Plan

Update `features/devotees/devotee-form-dialog.tsx`:

- Remove the create-mode registration type chooser.
- In create mode, show a scrollable dialog/sheet with:
  - Devotee details first.
  - Collapsible advanced devotee fields.
  - Family section below.
- Family section states:
  - No family
  - Add to existing family
  - Create new family
- Existing family path:
  - Search/select family.
  - Relationship select for the primary devotee.
- Create family path:
  - Family name and compact family fields.
  - Primary relationship select.
  - Member rows with `Search existing devotee` or `Create new member`.
  - Show selected existing devotee's current family, if any.
  - Require explicit move confirmation before allowing save when a selected devotee already has another family.

Preserve `features/devotees/family-form-wizard.tsx` for full family edit after creation.

### Search Behavior

Use existing tenant-scoped `/api/devotees?search=` for existing-devotee search unless the UI needs a smaller response shape. If a smaller response is needed, add a tenant-scoped search route under the devotees API rather than querying from the client.

Use `/api/devotees/families` for family selection. Family picker rows should show disambiguating summary fields. Do not rely on family name uniqueness in villages where many families share the same surname.

## Tasks / Subtasks

- [x] Task 1: Validation and contract tests (AC: 2, 3, 4, 5, 7, 8)
  - [x] Add `lib/validation/devotee-registration.ts`.
  - [x] Add tests for no-family, existing-family, new-family, existing-member, move-conflict, and exactly-one-head cases.

- [x] Task 2: Transaction service (AC: 2, 3, 4, 5, 6, 7, 8, 9)
  - [x] Add the composite registration service in `lib/db`.
  - [x] Reuse existing table contracts in `lib/db/devotee-families.ts` where practical.
  - [x] Ensure all writes are tenant-scoped and parameterized.
  - [x] Ensure moving an existing devotee updates old and new family state in one transaction.

- [x] Task 3: API route (AC: 2, 3, 4, 7, 9)
  - [x] Add `app/api/devotees/registration/route.ts`.
  - [x] Gate with `requireTenantAdminSession()`.
  - [x] Return 400 for validation, 401/403 for auth, 409 for duplicate phone or move conflict.
  - [x] Add the route to `app/api/tenant-dashboard-auth-boundary.test.ts`.

- [x] Task 4: UI refactor (AC: 1, 3, 4, 5, 7, 11)
  - [x] Refactor create mode in `features/devotees/devotee-form-dialog.tsx`.
  - [x] Keep edit mode compatible with existing profile editing.
  - [x] Add compact family section with no-family/existing-family/new-family states.
  - [x] Add existing-devotee search/select rows with current-family warning.
  - [x] Keep text in `locales/en/dashboard.json` and `locales/te/dashboard.json` in sync.

- [x] Task 5: Preserve existing family edit path (AC: 10)
  - [x] Do not remove `/dashboard/devotees/family/new` or edit routes unless explicitly approved.
  - [x] Ensure current `FamilyFormWizard` still saves family edits after the new add flow lands.

- [ ] Task 6: Verification (AC: 12)
  - [x] Run targeted validation/API tests first.
  - [ ] Run `npm run test`.
  - [ ] Run `npm run typecheck`.
  - [ ] Run `npm run lint`.

- [x] Task 7: Same-name family disambiguation (AC: 13)
  - [x] Extend family listing with optional search across family, head, member, contact, and location fields.
  - [x] Return summary fields for head, phone, member count, and member names.
  - [x] Replace create-flow existing-family dropdown with compact searchable summary rows.
  - [x] Show soft similar-family warning during new-family creation.

## Dev Notes

### Current Code To Read Before Editing

- `features/devotees/devotee-form-dialog.tsx`
  - Current create mode starts with a registration-type chooser and routes family creation to `/dashboard/devotees/family/new`.
  - Current edit mode loads families and allows assigning `familyId`, but this path only patches `devotees.family_id`.

- `features/devotees/family-form-wizard.tsx`
  - Current full-page family create/edit wizard.
  - Reuse field patterns and relationship options; do not duplicate relationship enums.

- `app/api/devotees/route.ts`
  - Current simple create/list endpoint.
  - Keep this route stable unless intentionally migrating all callers.

- `app/api/devotees/families/route.ts`
  - Current list/create family endpoint.
  - Create path only creates new devotees for members.

- `app/api/devotees/families/[id]/route.ts`
  - Current edit path supports existing member IDs only for members already in the edited family.

- `lib/db/devotee-families.ts`
  - Existing `createFamilyWithMembers` and `updateFamilyWithMembers` maintain `family_members` and `primary_devotee_id`.
  - Existing `addMembersToFamily` inserts new devotee rows only; it does not attach existing devotee rows.

- `lib/db/devotees.ts`
  - Reads join `devotee_families` and `family_members` to derive `familyName` and `relationship`.
  - `updateDevotee()` can update `family_id`, but it does not update `family_members`.

- `lib/validation/devotees.ts` and `lib/validation/devotee-families.ts`
  - Reuse date, enum, nullable string patterns.

- `types/db.ts`
  - Use `RELATIONSHIP_CODES`, `Gender`, `MaritalStatus`, and `SupportedLanguage`.

### Architecture Constraints

- Tenant-owned reads/writes must derive tenant from `requireTenantAdminSession()`, not client-provided tenant IDs.
- Raw SQL belongs behind `lib/db/*`.
- Phone numbers must be normalized before matching or insertion.
- Multi-row family/devotee writes must be transactional.
- Do not create `persons` rows or tenant memberships as part of this story.
- Do not add WhatsApp webhook, announcement, or consent-history work.
- Do not add a schema migration unless implementation discovers an actual missing constraint.

### UX Guardrails

- The add flow should feel like "add a devotee, optionally place them in a family," not "start a family wizard."
- Keep the first visible form section about the individual.
- Keep member rows compact. Use collapsible advanced fields for secondary details.
- Do not use nested cards for the dialog layout.
- Show current family for existing selected devotees to prevent accidental moves.

### Testing Guidance

- Validation tests: `lib/validation/devotee-registration.test.ts`.
- API route tests: follow the mocking style in `app/api/events/route.test.ts`.
- Auth boundary test: update `app/api/tenant-dashboard-auth-boundary.test.ts` to include the new route.
- Service tests are preferred for move semantics if a DB-backed test harness is available. If not, cover transaction-call intent with API tests plus validation tests and keep the transaction code small/reviewable.

## References

- PRD/devotee requirement: `_bmad-output/planning-artifacts/templeos-mvp-prd.md`
- Epic 4 devotee management: `_bmad-output/planning-artifacts/epics.md`
- Database tables: `migrations/014_family_management.sql`
- Database catalog: `docs/06-Reference/Database-Catalog.md`
- API catalog: `docs/06-Reference/API-Catalog.md`
- Current add dialog: `features/devotees/devotee-form-dialog.tsx`
- Current family wizard: `features/devotees/family-form-wizard.tsx`
- Current devotee repository: `lib/db/devotees.ts`
- Current family repository: `lib/db/devotee-families.ts`

## Dev Agent Record

### Agent Model Used

GPT-5 Codex

### Debug Log References

- `npx vitest run lib/validation/devotee-registration.test.ts` passed after validation schema implementation.
- `npx vitest run lib/db/devotee-registration.test.ts` passed after transaction service implementation.
- `npx vitest run app/api/devotees/registration/route.test.ts` passed after route implementation.
- `npx vitest run lib/validation/devotee-registration.test.ts lib/db/devotee-registration.test.ts app/api/devotees/registration/route.test.ts app/api/tenant-dashboard-auth-boundary.test.ts` passed: 4 files, 17 tests.
- `npx vitest run lib/db/devotee-families.test.ts app/api/devotees/families/route.test.ts lib/validation/devotee-registration.test.ts lib/db/devotee-registration.test.ts app/api/devotees/registration/route.test.ts app/api/tenant-dashboard-auth-boundary.test.ts` passed: 6 files, 19 tests.
- `npx eslint features/devotees/devotee-form-dialog.tsx lib/validation/devotee-registration.ts lib/validation/devotee-registration.test.ts lib/db/devotee-registration.ts lib/db/devotee-registration.test.ts app/api/devotees/registration/route.ts app/api/devotees/registration/route.test.ts app/api/tenant-dashboard-auth-boundary.test.ts` passed.
- `npx eslint features/devotees/devotee-form-dialog.tsx lib/db/devotee-families.ts lib/db/devotee-families.test.ts app/api/devotees/families/route.ts app/api/devotees/families/route.test.ts types/db.ts locales/en/dashboard.json locales/te/dashboard.json` passed for code files; locale JSON files were ignored by ESLint config.
- `node -e "JSON.parse(...)"` passed for `locales/en/dashboard.json` and `locales/te/dashboard.json`.
- Isolated story-file TypeScript check passed with `/private/tmp/templeos-devotee-registration-tsconfig.json`.
- Isolated family-disambiguation TypeScript check passed with `/private/tmp/templeos-family-disambiguation-tsconfig.json`.
- `npm run test` is blocked by unrelated existing failures: missing `razorpay` package import, `buildDonationExportColumns is not a function`, and merge conflict markers in `app/api/super-admin/temples/[tenantId]/payments/route.test.ts`. The run still reported 106 of 109 test files passed and 792 tests passed.
- `npm run typecheck` is blocked by unrelated merge conflict markers in `app/api/super-admin/temples/[tenantId]/payments/route.test.ts` and `features/donations/donations-table.tsx`.
- `npm run lint` is blocked by unrelated existing issues: undefined `DevoteeDetailActions` and `Bell` in `app/(dashboard)/dashboard/devotees/[id]/page.tsx`, conflict-marker parse errors in the payments route test and donations table, and an unused `_gradient` warning in `features/dashboard/metric-card.tsx`.

### Completion Notes List

- Added composite registration validation for no-family, existing-family, and new-family modes.
- Added a tenant-scoped transaction service that creates the primary devotee, creates or loads the target family, attaches new and existing members, updates moved devotees' `family_id`, maintains `family_members`, and enforces exactly one Head of Family.
- Added `POST /api/devotees/registration` with tenant admin/feature gating, validation errors, duplicate-phone conflict handling, and explicit family-move conflict handling.
- Refactored the create-mode Add Devotee UI into a unified individual-first form with an optional Family section for no family, existing family, or new family.
- Added same-name family disambiguation to the create flow with searchable family summary rows and soft duplicate warnings for new family creation.
- Preserved edit-mode devotee behavior and existing full family wizard routes.
- Updated English and Telugu dashboard locale strings for the new family section and resolved conflict markers encountered in touched locale files.

### File List

- `_bmad-output/implementation-artifacts/adhoc-unified-devotee-family-registration.md`
- `app/api/devotees/families/route.test.ts`
- `app/api/devotees/families/route.ts`
- `app/api/devotees/registration/route.test.ts`
- `app/api/devotees/registration/route.ts`
- `app/api/tenant-dashboard-auth-boundary.test.ts`
- `features/devotees/devotee-form-dialog.tsx`
- `lib/db/devotee-families.test.ts`
- `lib/db/devotee-families.ts`
- `lib/db/devotee-registration.test.ts`
- `lib/db/devotee-registration.ts`
- `lib/validation/devotee-registration.test.ts`
- `lib/validation/devotee-registration.ts`
- `types/db.ts`
- `locales/en/dashboard.json`
- `locales/te/dashboard.json`

### Change Log

- 2026-07-31: Implemented unified devotee/family registration flow; full-suite verification remains blocked by unrelated existing repo errors listed in Debug Log References.
- 2026-07-31: Added village same-name family disambiguation with richer family search results and soft similar-family warnings.
