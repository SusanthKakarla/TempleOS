<!-- title: TempleOS EL10 — Step 1 UI/UX Audit -->

# TempleOS EL10 — Step 1 UI/UX Audit

*Read-only audit. No implementation performed. Produced by direct file verification cross-referenced against `ARCHITECTURE_HANDBOOK.md` (commit `b267d7c`) — the handbook predates the Campaign module and the Neon Tokyo redesign's final state, so every claim below was re-checked against current `main` (`6b327bf`), not taken from the handbook alone.*

## 0. Context this audit was produced under

Two things are worth stating plainly before the findings, because they shape what "Step 2" should look like:

- **A second, concurrent Claude Code session has been active on this same repository**, building the Campaign module, WhatsApp Message Template system, and — most relevant here — a full **"Neon Tokyo" color-system migration** (commit `037f06d`) that replaced the "Lotus Pond" palette this conversation had been building toward. `globals.css` currently ships Neon Tokyo tokens.
- **The confirmed target for this task is a third palette** — Temple Red / Coral / Blue Accent / Warm Neutral (this spec's "Global Design System" section) — replacing Neon Tokyo in turn. Section 2 below audits the *current* (Neon Tokyo) state as the baseline to migrate off of.

Given the concurrent session, **this audit is read-only by design** and Step 2 implementation should not start until scope is divided between the two sessions (see §12).

---

## 1. Existing WhatsApp Flow

**Two layers, cleanly separated:**

- **Inbound / bot conversation** (`app/api/whatsapp/webhook/route.ts`, POST handler): Meta webhook → logs message → upserts devotee → runs bot reply logic (FAQs, sevas, events, special days, social links — all read-only DB lookups) → sends reply via `sendTextMessage`/`sendButtonMessage`/`sendListMessage`, bypassing the Delivery Strategy layer entirely (always inside an open 24h window by construction, since it's a reply).
- **Outbound / business-triggered** (Notification Engine → Delivery Strategy → Template System or free-form send).

**Current bot menu** (read from the FAQ/seva/event/special-day/social-link content tables surfaced through Chatbot Settings, not hardcoded menu copy in the webhook itself) is content-driven per tenant — "remove FAQ and Timings from the menu" is a **content/flow change in the webhook's reply-construction logic** (`app/api/whatsapp/webhook/route.ts`), not a UI change. This is bot conversation logic, which the spec's own "Do NOT modify... Business Logic" instruction would normally exclude — flagged as a scope question in §12, and it directly overlaps with what the other session already owns (they built the whole WhatsApp Template/menu system).

**One unresolved security finding carried over from the handbook, unrelated to this task but worth knowing:** the webhook POST handler has no Meta signature verification. Out of scope for a UI pass; noting it exists.

## 2. Existing Campaign Flow

Verified directly (not just via the other session's plan notes): `app/(dashboard)/dashboard/campaigns/page.tsx` → `CampaignsTable`, `campaign-detail.tsx`, `campaign-form-dialog.tsx` (`features/campaigns/`), backed by `lib/db/campaigns.ts`, `lib/campaigns/{run-campaign,lifecycle,recurrence}.ts`, and `app/api/campaigns/**` (8+ routes). Reuses the same Notification Engine every other feature uses (`enqueueCampaignBroadcast` → `notifications` table, `runCampaignNow` → the same `processNotifications()`).

**Form complexity the spec's premise correctly identifies**, confirmed by direct read of `campaign-form-dialog.tsx`: a `CampaignType` select (`CAMPAIGN_TYPES`), an audience-filter type (`all/active/donors/opted_in/language`), a three-way schedule choice (`now/later/recurring`) with a separate `RecurrenceRule` picker, a date-only field distinct from the send-time field, plus banner media upload — genuinely more surface area than a single-purpose "Donation Campaign" tool needs if, per the spec, donation campaigns are the only type actually used. **Does TempleOS actually run non-donation campaign types today, or is `CampaignType` a generalized field with only one value ever chosen in practice?** This determines whether removing the type dropdown is a safe simplification or a feature removal — needs a direct answer before Step 2 touches this file.

## 3. Existing Notification Flow

Single generic engine (`lib/notifications/engine.ts`, `lib/notifications/delivery.ts`, `notifications` table) plus one legacy parallel pipeline (`event_notifications` table, cron-drain-only, no new writes, explicitly documented as superseded). Delivery Strategy layer (`lib/whatsapp/delivery-strategy.ts`) picks `FREE_FORM` / `TEMPLATE` / `UNDELIVERABLE` per the 24-hour conversation window. This is backend logic — the spec's "Do NOT modify... Notification Engine" instruction cleanly excludes it. The only UI surface is `notification-settings-content.tsx` + `automated-notification-list.tsx` in Chatbot Settings, and the per-person `notification-preferences-form.tsx`.

## 4. Existing Donation Flow

`app/(dashboard)/dashboard/donations/page.tsx` → `DonationsTable`, `donation-form-dialog.tsx` (shared between the ledger and the devotee-detail donation card). Already has: search, date-range filter with presets, purpose filter, export (Excel/CSV/PDF), and — from this conversation's own Phase 4 work — two `MetricCard` stat pills (Total this month / Total all time). The spec's ask ("auto-select campaign, auto-fill devotee if opened from profile, large amount-preset buttons ₹101/₹501/₹1001/₹5001/Custom") is additive to the existing form, not a rebuild — `DonationFormDialog` already accepts a `fixedDevoteeId` prop (used by the devotee-card entry point), so "auto-fill devotee from profile" is **already implemented**; only the amount-preset buttons and campaign auto-select are new.

## 5. Existing Devotee Flow

`app/(dashboard)/dashboard/devotees/page.tsx` → `DevoteesTable` (608 lines, the largest file in its folder) — already has `ResponsiveSearchBar`, `FilterBottomSheet`, desktop table / mobile card split, export menu, long-press multi-select. `devotee-form-dialog.tsx` is the Add/Edit form the spec wants simplified into Basic/Advanced sections. This conversation's own Phase 3 audit found this table already excellent; the **form dialog itself was never audited in this conversation** — worth a direct field-count check before Step 2 (see §9 below, which lists it as unverified).

## 6. Existing Forms

Pattern is consistent app-wide (verified across ~15 forms read directly across this conversation's phases): `"use client"` + manual `useState` per field + `handleSubmit(e: FormEvent)` → `fetch()` to a Next.js API route → `router.refresh()`/toast. **No `react-hook-form`, no `zod` resolver anywhere** (confirmed zero matches, both by this conversation's own earlier grep and the handbook's independent file classification). This is a deliberate, consistent house style, not an oversight — any redesign should keep this convention, not introduce a form library mid-project.

## 7. Existing Components / Shared Components

Verified reusable, all confirmed wired into 3+ consumers: `PageHeader`, `TableShell`, `EmptyState`, `PaginationControls`, `MobileListView`/`MobileListRow`, `FilterBottomSheet`, `ResponsiveSearchBar`, `ExportMenu` (devotees/donations/events/users), `MetricCard` (both dashboards + donations + notification settings), `MediaUpload` (event banners, greeting media, festival media, **and now campaign banners**). `components/ui/*` (29 shadcn/base-ui primitives, all confirmed non-orphaned).

**One new item confirmed since this conversation's own work**: `components/sticky-toolbar.tsx` already exists (added by the other session, per the handbook's file listing) — **this may already solve Issue 1 and Issue 5's "sticky toolbar" ask.** Needs a direct read before building anything new for those two issues, to confirm it's not already done.

## 8. Existing UI Patterns

- List pages: `PageHeader` → filter/search row → desktop table (`hidden md:block`) + mobile card list (`md:hidden`) → `PaginationControls`. Consistent across Devotees, Donations, Users, and (after this conversation's Phase 4/7 work) Events and the Super Admin console.
- Settings pages: `SettingsSection` (collapsible `glass-card` wrapper) grouping multiple forms/tables under one page (`Chatbot Settings`).
- Detail pages: stacked `Card`s, each one topic (Devotee Detail, Temple Detail).

## 9. Existing Color System / Design Tokens

**Currently live: Neon Tokyo** (`app/globals.css` header: *"replacing the prior 'Lotus Pond'... no non-Neon-Tokyo color survives anywhere in the app"*). Primary `oklch(0.657 0.241 6.9)` (≈ neon pink), full token set (`--primary`, `--saffron`, `--gold`, `--lotus-pink`, gradient utility classes) re-aliased to neon hues. Two **legacy, purely cosmetic naming debts** carried over from before Lotus Pond even existed, confirmed still present: `--persian-green`/`--fire-red` tokens and `.gradient-blue-purple`/`.gradient-ocean-blue` utility classes — names no longer describe their actual (now neon) colors, ~17 call sites. Migrating to Temple Red is the right moment to also just rename these, since every call site is being touched anyway.

**Radius/spacing**: `--card-spacing` CSS var (`--spacing(4)`, i.e. 16px, `--spacing(3)`/12px on `size="sm"` cards) — already on a 4px-multiple grid, compatible with the spec's requested 4/8/12/16/24/32/48 scale without restructuring.

**Font**: currently Playfair Display (headings) + Plus Jakarta Sans (body) — the spec asks for **Inter** throughout, a real typography change, not just a color swap.

## 10. Existing Layout Components

`DashboardShell` / `SuperAdminShell` (near-identical structure, independently maintained `NAV_ITEMS`/`SUPER_ADMIN_NAV_ITEMS`), `AppSidebar`/`SuperAdminSidebar` (shadcn `Sidebar` primitive, `collapsible="icon"`, drawer below 768px via `useIsMobile`), `DashboardTopbar`/`SuperAdminTopbar`, and now (per the other session, confirmed in the handbook) **`super-admin-bottom-nav-bar.tsx`** — meaning both dashboards already have a bottom nav component, addressing this spec's "apply to both Tenant and Super Admin" ask structurally, though the actual item sets on each need checking against this spec's exact list (Dashboard/Devotees/Events/Donations/More) before assuming they match.

## 11. Existing Buttons / Dialogs / Cards / Tables

- **Buttons**: `components/ui/button.tsx` has custom variants (`default` = gradient + glow, `success`, plus stock `outline/secondary/ghost/destructive/link`), a ripple effect, and `xs/icon-xs/icon-sm/icon-lg` sizes beyond stock shadcn.
- **Dialogs**: consistent `Dialog`/`AlertDialog` (base-ui, not Radix) pattern across every create/edit/confirm flow — no duplicate dialog implementations found.
- **Cards**: `components/ui/card.tsx` — `flex flex-col`, `--card-spacing` var, `has-data-[slot=card-footer]:pb-0`. **This conversation found and fixed one real structural bug here**: `CardContent` has no `flex-1`, so any card-in-a-grid with a `CardFooter` and variable content height (only `EventCard` matched this pattern) misaligned its footer across siblings. Fixed in `event-card.tsx` specifically, not the shared primitive (the other 5 `CardFooter` consumers are standalone, not grid-mounted, so didn't need it).
- **Tables**: `components/ui/table.tsx` has a custom `useCanScrollRight` fade-hint hook for horizontal overflow — already present, not something to add.

## 12. Reusable / Duplicate / Overengineered / Unused / Dead UI

Per the handbook's methodical zero-importer scan (cross-verified, not taken on faith):

| Finding | Status | Action implied |
|---|---|---|
| `components/floating-action-button.tsx` | **Confirmed dead** — zero real imports, only a JSDoc mention | Delete, or actually wire it in if a FAB is still wanted somewhere (this conversation deliberately chose *not* to use it in Phase 3, preferring the existing always-visible header button — same conclusion, independently reached) |
| `isUniqueViolation(err)` reimplemented locally | 9 files duplicate instead of importing `lib/db/unique-violation.ts` | Not a UI concern, skip for this task |
| `formatEventTime` | Byte-identical duplicate in `events-table.tsx` and `event-card.tsx` | Low-risk UI cleanup candidate if touching either file anyway |
| `formatTimestamp` | Near-duplicate in `admins-list.tsx` / `temples-list.tsx` | Same, low priority |
| Two components named `NotificationPreferencesForm` | Different scope (tenant-wide vs. per-person), not true duplication, but a genuine IDE-navigation trap | Rename one if touching either file |
| Retired `/api/admins` stubs + `/dashboard/admins` redirect page | Dead, test-enforced as intentionally retired | Safe to delete, not a redesign blocker |

**No overengineered or genuinely orphaned feature component was found** — the handbook traced all 80 `features/**` files to at least one consumer, including both of the other session's new untracked additions at the time (`sticky-toolbar.tsx`, `super-admin-bottom-nav-bar.tsx`).

**Nested containers**: the clearest concrete example matching Issue 11's complaint is the Super Admin Platform Dashboard (`app/(super-admin)/super-admin/(shell)/page.tsx`) — a metrics grid, then a "Platform Health" `glass-card` wrapping 4+ `HealthTile` cards, then a separate "Live Activity" `glass-card`, then a "Quick Actions" `glass-card` — three levels of card-in-card-in-section. This is the strongest single candidate for the "reduce nesting" ask, and matches Issue 8's own complaint about that exact page.

---

## 13. Verification honesty

This audit is grounded in: (a) direct reads of `campaign-form-dialog.tsx`, `campaigns/page.tsx`, `donation-form-dialog.tsx` usage, `card.tsx`, `button.tsx`, `table.tsx` performed for this audit; (b) this conversation's own first-hand work across 7 redesign phases (Devotees, Events, Donations, Users, Chatbot Settings, Super Admin, auth); (c) `ARCHITECTURE_HANDBOOK.md`, itself methodologically sound (import-graph zero-importer scan, manually grep-verified) but **stale on Campaign module specifics**, which is why §2 above was re-verified directly rather than quoted from it.

**Resolved during this audit:**
- **Issues 1 and 5 (sticky toolbars) are already done.** `components/sticky-toolbar.tsx` exists and is confirmed wired into both `features/devotees/devotees-table.tsx` and `features/users/users-table.tsx` (`grep` confirms both consumers). Its own docstring describes exactly the behavior both issues ask for: title/actions + search/filter pinned to the top, only the list scrolls. **No new work needed for Issues 1 or 5** unless spacing/alignment within the already-sticky toolbar needs polish once Temple Red is applied.

**Still not directly verified, flagged rather than assumed:**
- `devotee-form-dialog.tsx`'s actual current field count/layout (Issue 3's premise)
- The bottom-nav item sets currently on `bottom-nav-bar.tsx` and `super-admin-bottom-nav-bar.tsx` vs. this spec's exact requested list
- Whether `CampaignType` has more than one value ever used in practice (determines if removing the dropdown is safe)

---

## 14. Recommendation before Step 2

1. **Resolve the concurrent-session scope split first.** This spec's WhatsApp menu ask and Campaign form ask overlap directly with what the other session already built and appears to still own. Suggest: this session handles pure UI/design-system work (color migration, forms, cards, dashboard layout, sidebar/nav polish) on files not currently being touched by the other session; the other session (or a coordinated follow-up) handles WhatsApp bot-menu content and Campaign form field changes, since those are adjacent to business logic it already owns.
2. **Answer the 4 unverified items in §13** before writing any Step 2 code against them — each one changes what "correct" looks like for that specific issue.
3. Everything else in this audit is verified and ready to inform Step 2 directly.
