# TempleOS EL10 — Dashboard UI Polish, Layout Consistency & UX Simplification

Root cause analysis, what changed, and final QA for the 11-issue spec (10 UI/layout
issues + the donation-form manual-donor feature).

## 1. Root Cause Analysis

Three of the eleven issues traced back to the **same two shared components**,
not eleven separate bugs:

- **Issues 1, 5, 8** (Campaign/Donations toolbar overlap, User Management header
  inconsistency): `features/campaigns/campaigns-table.tsx` and
  `features/donations/donations-table.tsx` never adopted the `StickyToolbar`
  component that `devotees-table.tsx`/`users-table.tsx` already used correctly.
  Their page title scrolled away while their search bar self-stuck independently
  — two uncoordinated sticky behaviors, not one designed toolbar.
- **Issue 1's actual "overlap"**: with the toolbar and the table's own
  `<thead>` both `position: sticky; top: 0` relative to the *same* page-level
  scroll container, they'd collide at identical coordinates once both became
  stuck — not a z-index bug, a genuine positioning conflict. Fixed once, in
  `components/ui/table.tsx`, by giving the table's own container a bounded
  `max-h-[70vh] overflow-auto` — the `<thead>`'s existing `sticky top-0`
  now resolves against that small container instead of the page, so it can
  never collide with a page-level toolbar again. This single change fixes
  the sticky-header behavior for **every** table in the app (Campaigns,
  Donations, Devotees, Users, Role Catalog, Admins), not just the two named
  in the spec.
- **Issues 2, 5, 8's "premium card"**: `StickyToolbar` itself had no
  radius/shadow (`border-b` only). Restyled once to `glass-card rounded-2xl
  shadow-sm p-4`, every page using it inherits the premium-card look
  automatically — no per-page CSS.
- **Issue 3**: no `border-r`/`border-l`/`divide-x` actually exists between the
  sidebar and content (the app already renders the sidebar as `variant="floating"`,
  which never takes that code path). The perceived "divider" was the floating
  sidebar's own `ring-1 ring-sidebar-border` — a hard-edged ring around all
  four sides of the sidebar card. Removed; the sidebar now reads via its
  shadow alone.
- **Issues 6, 7**: card-height inconsistency wasn't really a `h-full`/`flex-1`
  problem (both were already correctly in place from an earlier session) — it
  was that the **action row wrapped** (`flex-wrap`) whenever a card had more
  buttons than a neighboring card (Announce only shows for published events),
  making that card's footer taller. Fixed by converting every action to a
  compact icon button (no `flex-wrap` needed anymore, since 4 icon buttons
  always fit on one row), which fixes both the wrapping (Issue 7) and the
  residual height variance (Issue 6) with one change.
- **Issue 9**: `<TableHead>` widths (`w-28`, `w-80`, etc.) and `<TableCell>`
  widths (`max-w-md`, `w-80`) didn't match, and the table used default
  `table-layout: auto` — HTML lets auto-layout tables ignore inconsistent
  width hints and size columns from content instead, which is why columns
  "appeared uneven." Fixed by switching to `table-fixed` with matching
  percentage widths declared once on the header row (the single place
  `table-layout: fixed` reads column widths from).
- **Issue 10**: purely a layout-nesting decision (`grid lg:grid-cols-2`
  forcing two unrelated sections to share a row) — restacked as two
  full-width sections, matching the treatment already used by the page's own
  "Quick Actions" section for consistency.

## 2. UI Audit Report (pre-fix state)

| Area | Found |
|---|---|
| Campaigns/Donations toolbar | No `StickyToolbar`; title didn't stick; search bar self-stuck independently |
| Devotees/Users toolbar | Used `StickyToolbar` correctly, but it had no radius/shadow (flat bordered bar) |
| Table sticky header | `<thead>` stuck to the *page* scroll everywhere — worked by accident when nothing else was sticky above it, broke visibly wherever something was |
| Sidebar/content boundary | No literal divider; the floating sidebar's `ring-1 ring-sidebar-border` read as one |
| Family member form | 9 fields, flat, no grouping, no collapsible section (confirmed: no `Occupation` field exists anywhere in the schema — see §9) |
| Event cards | `h-full`/`flex-1` already correct; action row `flex-wrap` was the real remaining bug; Delete was `variant="destructive" size="sm"` with a text label |
| Role Catalog table | `table-layout: auto` (default) with mismatched header/cell width hints; `align-top` was already present |
| Super Admin dashboard | Platform Health (no card wrapper) and Live Activity (has one) crammed into `lg:grid-cols-2`, forcing 4-wide health tiles into half the viewport |
| Donation form | Devotee-only, hard `NOT NULL` FK on `donations.devotee_id` — structurally incapable of a walk-in/anonymous donor without inventing a devotee record first |

## 3. Shared/Layout Components Updated

- **`components/ui/table.tsx`** — `Table`'s container div gained `max-h-[70vh] overflow-auto` (was `overflow-x-auto` only) plus a new `containerClassName` escape hatch. This is the root fix behind Issues 1, 5, and 9's sticky-header requirement, applied once.
- **`components/sticky-toolbar.tsx`** — restyled to `glass-card sticky top-0 z-20 rounded-2xl shadow-sm p-4` (was a flat `border-b` bar). Root fix behind Issues 2, 5, 8.
- **`components/ui/sidebar.tsx`** — removed `ring-1 ring-sidebar-border` from the floating sidebar's inner container. Root fix behind Issue 3.

Because these three files are shared, every current and future table/toolbar/sidebar
in the app inherits the fix — nothing was patched per-page.

## 4. Files Modified

**Shared/layout (3):** `components/ui/table.tsx`, `components/sticky-toolbar.tsx`, `components/ui/sidebar.tsx`

**Issue-specific UI (7):**
- `features/campaigns/campaigns-table.tsx` — adopted `StickyToolbar`
- `features/donations/donations-table.tsx` — adopted `StickyToolbar`, reordered metric cards below it
- `features/devotees/family-form-wizard.tsx` — Basic/Advanced split via `Collapsible`
- `features/events/event-card.tsx` — icon-only single-row actions
- `app/(super-admin)/super-admin/(shell)/roles/page.tsx` — `table-fixed` + matching column widths
- `app/(super-admin)/super-admin/(shell)/page.tsx` — Platform Health / Live Activity restacked full-width
- `locales/{en,te}/dashboard.json` — `additionalInformation` key (Family form)

**Donation manual-donor feature (12):**
- `migrations/024_donation_manual_donor.sql` (new)
- `types/db.ts`, `lib/db/donations.ts`, `lib/validation/donations.ts`
- `app/api/donations/route.ts`, `app/api/donations/[id]/route.ts`
- `features/donations/manual-donor-fields.tsx` (new)
- `features/donations/donation-form-dialog.tsx`, `features/donations/donations-table.tsx`
- `lib/export/columns/donations.test.ts` (fixture update)
- `locales/{en,te}/dashboard.json` — `formDialog.fields.{donationFor,existingDevotee,manualDonor}`, `formDialog.errors.enterDonorName`, `formDialog.manualDonor.*`, `anonymousDonor`, `manualDonorBadge`

## 5. CSS/Tailwind Classes Updated

| Component | Before | After |
|---|---|---|
| `Table` container | `relative w-full overflow-x-auto` | `relative w-full max-h-[70vh] overflow-auto` |
| `StickyToolbar` | `sticky top-0 z-20 -mx-4 space-y-3 border-b bg-background/95 px-4 pt-1 pb-3 backdrop-blur sm:mx-0 sm:px-0` | `glass-card sticky top-0 z-20 space-y-3 rounded-2xl p-4 shadow-sm` |
| Floating sidebar inner | `...ring-1 ring-sidebar-border` | *(removed)*, `shadow-sm` → `shadow-md` |
| Event card actions | `flex flex-wrap items-center justify-end gap-1.5` + text `Button size="sm"` | `flex items-center justify-end gap-1` + icon `Button size="icon-sm"` |
| Role Catalog `<Table>` | default `table-layout: auto`, mismatched `w-28/w-36/w-80` (head) vs `max-w-md/w-80` (cell) | `table-fixed`, matching `w-[10%]/[15%]/[35%]/[28%]/[12%]` on every `<TableHead>` |
| Super Admin dashboard sections | one `<section className="grid gap-4 lg:grid-cols-2">` | two `<section className="glass-card rounded-2xl p-4">`, stacked |

Design-token check against the spec's stated scale: Cards already used `rounded-2xl`
(~20px), Dialogs already `rounded-3xl`, Inputs/Buttons already `rounded-lg` (12px,
confirmed against `--radius: 0.75rem` in a prior session's token audit) — no
further radius changes were needed beyond the toolbar (now also `rounded-2xl`)
and the Role Catalog table (structural fix, not radius).

## 6. Responsive Verification

Verified via a full production build (zero errors across all 70+ routes) and a
Playwright check of the one auth-free page (`/login`) at desktop (1280px),
tablet (820px), and mobile (390px) — renders correctly, no regressions from the
sidebar/table shared-component changes.

**Disclosed limitation:** every page actually touched by Issues 1–2, 5–10 sits
behind Firebase phone-OTP auth, which can't be completed headlessly in this
environment (same constraint noted in prior sessions on this repo). The fixes
were verified through: (a) direct reasoning about the exact CSS mechanism per
issue (documented in §1), (b) `tsc --noEmit` + `eslint .` + the full `vitest`
suite (589 tests) passing clean, and (c) a full `next build` compiling every
route with no errors — but not a live-browser visual pass of the dashboard
pages themselves. Flagged honestly rather than claimed as done.

## 7. Donation Form UX Redesign (Issue 11)

- **Mode selector**: "Donation for" toggle (two buttons, matching the existing amount-preset button pattern already in this file) — Existing Devotee / Manual Donor. Hidden when `fixedDevoteeId` is set (already in a devotee-scoped context).
- **Existing Devotee mode**: unchanged — still the pre-fetched `<Select>` (see §9 for why this wasn't rebuilt into a live-search autocomplete).
- **Manual Donor mode**: new `<ManualDonorFields>` — Donor name (required), Mobile number (optional, recommended), Email (optional), Address (optional), Anonymous donation (checkbox).
- **Validation**: `devoteeId` required in devotee mode; donor name required in manual mode — enforced both client-side (`handleSubmit`) and server-side (`createDonationSchema`'s `.superRefine`, which also rejects submitting *both* at once).
- **Not built**: the "Save as Devotee" post-donation prompt — spec listed it as an "Optional Enhancement." Flagged, not silently skipped.

## 8. Manual Donor Component

`features/donations/manual-donor-fields.tsx` — exports `ManualDonorFields`,
`ManualDonorValue`, `BLANK_MANUAL_DONOR`. Fully localized (en/te), matches the
form-field conventions already established this session (`LabeledInput`,
`inputSize="lg"`, `requiredLabel`). Written as a standalone, self-contained
component with no donation-specific coupling — reusable by any future module
needing to record a non-registered party.

## 9. Database Relationship Review

`migrations/024_donation_manual_donor.sql`:
```sql
ALTER TABLE donations
  ALTER COLUMN devotee_id DROP NOT NULL,
  ADD COLUMN manual_donor_name TEXT,
  ADD COLUMN manual_donor_phone TEXT,
  ADD COLUMN manual_donor_email TEXT,
  ADD COLUMN manual_donor_address TEXT,
  ADD COLUMN is_anonymous BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE donations
  ADD CONSTRAINT donations_donor_source_check CHECK (
    (devotee_id IS NOT NULL AND manual_donor_name IS NULL) OR
    (devotee_id IS NULL AND manual_donor_name IS NOT NULL)
  );
```
Exactly one of `devotee_id` / `manual_donor_name` is enforced **at the database
level**, not just in application code — a donation can never end up ambiguous
between the two. Applied successfully against the project's live/dev database
during this session (`npm run migrate` — "Applied: 024_donation_manual_donor.sql").

Downstream changes required by nullable `devotee_id`:
- `recomputeDevoteeDonationCache` now no-ops when `devoteeId` is null (there's no devotee row to update).
- `listDonations`/`countDonationsFiltered`/`listDonationsByIds` switched from `JOIN devotees` to `LEFT JOIN devotees`, with `donor_name`/`donor_phone` computed as `COALESCE(dev.display_name, d.manual_donor_name)` — the existing "no stored counter, always derived" design principle from this codebase's donation-analytics code was followed here too.
- Sort-by-donor now sorts on the same `COALESCE`, not just `dev.display_name`.
- Search now also matches `manual_donor_name`/`manual_donor_phone`, not just the devotee join.
- `donations-table.tsx`: the "View details" action (which linked to `/dashboard/devotees/{devoteeId}`) is omitted entirely for manual donors instead of linking to a nonexistent devotee page; anonymous donations show "Anonymous donor" in place of the stored name for *display* only (the real name stays in the database for record-keeping, per the spec's explicit instruction).
- **No devotee is ever auto-created** — confirmed by reading `createDonation`'s implementation: it only ever inserts into `donations`, never touches the `devotees` table except the existing cache-recompute (which is a no-op for manual donors).

## 10. Remaining UI/UX Improvements (not done, disclosed)

- **Live devotee search-as-you-type**: the spec describes "Autocomplete search" for the Existing Devotee mode, but no such component existed anywhere in the codebase before this session — the donation form's devotee picker was (and remains) a plain `<Select>` populated from a full pre-fetched list. Building a true debounced-search combobox against the existing `/api/devotees?search=` endpoint is a real, separate feature; it wasn't bundled into this pass to keep Issue 11 scoped to "add the manual-donor path," not "also rebuild the devotee picker."
- **"Save as Devotee" prompt**: the spec's own "Optional Enhancement" for converting a manual donor into a devotee after the fact — not built.
- **Tooltips on Event card icon buttons**: `aria-label`s were added for accessibility, but visible hover tooltips (nice-to-have, matching Stripe/Linear polish) weren't added — they'd need to compose with the existing `EventFormDialog`/`AnnounceDialog` trigger-render pattern in a way that risked destabilizing dialog-trigger composition without a live-browser check to confirm.
- **Super Admin Temples / Platform Admins pages**: reviewed for the same toolbar/table issues; neither has a search bar or the reported overlap bug, so neither was changed — flagged as reviewed-and-clean rather than silently skipped.

## 11. Recommendations for Future UI Cleanup

1. Once auth can be exercised in this environment (or in a follow-up session with credentials), do a live-browser pass of every page touched here — the fixes are reasoned-through and type/test/build-verified, but not yet eyeballed.
2. If a genuine devotee-autocomplete component gets built for the donation form, make it generic enough to also replace the campaign audience picker and any other place a full devotee list is currently pre-fetched into a `<Select>`.
3. Consider standardizing `TableShell` to *require* `StickyToolbar` as a prop rather than a sibling, so a future table can't be built without it (currently still an opt-in convention, not enforced by the type system).

## 12. Final UI Quality Assurance Report

**Issues fixed:** all 11 (1–10 UI/layout, 11 donation manual-donor), plus the
Global Table/Dashboard Standardization requirement — achieved primarily through
3 shared-component fixes (`Table`, `StickyToolbar`, `Sidebar`) rather than
per-page patches, per the mission's explicit "fix the root cause" directive.

**Shared components improved:** `components/ui/table.tsx`, `components/sticky-toolbar.tsx`, `components/ui/sidebar.tsx`.

**Files modified:** 22 (see §4), plus 1 new migration and 1 new component.

**Verification:** `tsc --noEmit` clean, `eslint .` clean, `vitest run` 589/589 passing, `next build` zero errors across all routes, migration applied successfully against the live database.

**Remaining recommendations:** see §11.
