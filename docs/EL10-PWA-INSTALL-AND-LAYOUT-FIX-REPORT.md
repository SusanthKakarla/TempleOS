# TempleOS EL10 — Smart App Installation & Global Dashboard Layout Fix

## 1. Layout Audit Report

Reviewed: `DashboardShell`/`SuperAdminShell` (shared shell chrome), `DashboardTopbar`/`SuperAdminTopbar`, `StickyToolbar`, `TableShell`, every dashboard-route `page.tsx`'s root wrapper, z-index usage app-wide, and the PWA surface (manifest, icons, service worker).

**Why content starts too close to the top navigation, and why cards look like they collide:**
`DashboardShell`/`SuperAdminShell` stack the topbar and the content panel with `flex flex-col gap-3` — a 12px gap. Both elements are `rounded-3xl` (~26px corner radius). When the gap between two rounded cards is smaller than their corner radius, the curves visually read as intersecting/colliding rather than sitting apart — that's the "unfinished" look in the screenshot, not a z-index or overlap bug in the literal sense.

**Why spacing is inconsistent between pages:**
Nearly every `app/**/page.tsx` root wrapper already uses `space-y-6` (24px) — this is the dominant, correct convention. But `devotees-table.tsx`, `donations-table.tsx`, `campaigns-table.tsx`, and `users-table.tsx` (the components actually rendered at the root of the Devotees/Donations/Campaigns/Users routes) used `space-y-4` (16px) instead, a drift from the established standard. Combined with `StickyToolbar`/`TableShell` both being `rounded-2xl` (~22px radius), 16px < 22px produces the same corner-collision look described above, on exactly those 4 pages — Events and every other route (which already used `space-y-6`) never showed the bug.

**Why install support is missing:** confirmed via full audit — no service worker anywhere in the repo, no install-detection logic, no Apple web-app meta tags, and `app/manifest.ts` had only the bare minimum fields (name, icons, start_url, display, colors) with no `scope`, `id`, `categories`, or `display_override`.

**Duplication found:** `DashboardShell` and `SuperAdminShell` were byte-for-byte identical except for which sidebar/topbar/bottom-nav they passed in and one footer word ("Pilot" vs "Platform") — a second root cause behind spacing drift, since any future shell tweak had to be applied twice (and evidently wasn't, historically).

## 2. Root Cause Analysis

| Symptom | Root cause | Fix location |
|---|---|---|
| Content touches top nav | 12px shell gap vs. ~26px card radius | `DashboardFrame` (new, shared) |
| Cards look like they collide | Toolbar↔table gap (16px) smaller than card radius (~22px) on 4 outlier pages | 4 page-root wrappers aligned to the app's own existing 24px standard |
| Shell logic duplicated | No shared frame component | New `DashboardFrame` |
| No install support | No PWA install architecture existed | New `components/pwa/*` |

No CSS hacks, no per-page margin overrides, no !important — every fix lives in a shared component or corrects an outlier to match an already-established, already-working convention.

## 3. Shared Layout Components Updated

- **`features/dashboard/dashboard-frame.tsx`** (new) — the single shell implementation both `DashboardShell` and `SuperAdminShell` now compose (sidebar/topbar/bottomNav/footerLabel as props). Topbar→content gap raised from `gap-3` (12px) to `gap-6` (24px).
- **`features/dashboard/dashboard-shell.tsx`**, **`features/super-admin/super-admin-shell.tsx`** — reduced to thin wrappers supplying their own sidebar/topbar/bottom-nav to `DashboardFrame`. Eliminates the prior full duplication.
- **`features/devotees/devotees-table.tsx`**, **`features/donations/donations-table.tsx`**, **`features/campaigns/campaigns-table.tsx`**, **`features/users/users-table.tsx`** — root wrapper `space-y-4` → `space-y-6`, aligning to the convention already used by every other page (Events, Dashboard Home, Super Admin Dashboard, Role Catalog, Notification Preferences, Chatbot Settings, Settings).

No changes were needed to `StickyToolbar`, `TableShell`, or `components/ui/table.tsx` (fixed in the prior UI-polish pass) — the sticky-header/scroll-container mechanics were already correct; only the vertical rhythm around them needed to be consistent.

## 4. Shared PWA Components Created

All under `components/pwa/`:

| Component | Role |
|---|---|
| `install-context.ts` | `InstallContext` + `useInstall()` hook — `state` (`installed` / `installable` / `ios-manual` / `unsupported`), `isDismissed`, `promptInstall()`, `dismiss()` |
| `install-provider.tsx` | `InstallProvider` — combines the spec's "InstallProvider" (context) and "InstallManager" (`beforeinstallprompt`/`appinstalled` event wiring) into one component, since this codebase has no separate event-bus/worker layer that would make splitting them into two files anything but prop-forwarding. Detects standalone/iOS/dismissal state via `useSyncExternalStore` (the same SSR-safe pattern `lib/use-resolved-theme.ts` already uses), never a raw `setState` inside an effect body. |
| `install-button.tsx` | `InstallButton` — renders as a `DropdownMenuItem` (account menu) or a `Button` (Settings page); renders nothing when already installed or unsupported, so it's safe to mount in both places without ever showing two competing prompts. |
| `install-banner.tsx` | `InstallBanner` — dismissible nudge, mounted only on the new Settings page (not globally), so dismissing it can never leave "no way to install" — the InstallButton is always still reachable from the account menu. |
| `install-dialog.tsx` | `InstallDialog` — iOS-only "Tap Share → Add to Home Screen" step-by-step instructions, since Safari has no `beforeinstallprompt`. |
| `pwa-status.tsx` | `PWAStatus` — the Settings → Application → Installation Status card (Installed / Not Installed / unsupported-browser messaging). |
| `service-worker-register.tsx` | Registers `public/sw.js` on mount; swallows registration failures silently (the app works fully without it). |

**Detection strategy (never a single API):** standalone/installed via `matchMedia("(display-mode: standalone)")` **and** iOS's `navigator.standalone`; installability via the captured `beforeinstallprompt` event; iOS specifically via a UA/touch-point check (since iOS never fires `beforeinstallprompt`); anything that is none of the above is `"unsupported"` (e.g. desktop Firefox).

**Single install surface, by design:** the actionable "Install TempleOS" control lives in exactly one place — the account dropdown menu (present in both the tenant dashboard and Super Admin topbars) — satisfying "Top Navigation or User Profile Menu" from the spec while guaranteeing "never display multiple install buttons" trivially. The Settings page additionally surfaces `PWAStatus`/`InstallBanner` as a dedicated status view (Step 8 of the spec), not a second competing prompt.

## 5. Files Modified

**Shared layout (5):** `features/dashboard/dashboard-frame.tsx` (new), `features/dashboard/dashboard-shell.tsx`, `features/super-admin/super-admin-shell.tsx`, plus the 4 outlier page-root spacing fixes listed in §3.

**PWA (11):** the 7 new `components/pwa/*` files above, `public/sw.js` (new), `app/manifest.ts`, `app/layout.tsx`, `app/(dashboard)/dashboard/settings/page.tsx` (new).

**Navigation (2):** `features/dashboard/dashboard-topbar.tsx` (added "Settings" link + `InstallButton`), `features/super-admin/super-admin-topbar.tsx` (added `InstallButton`; kept plain-English per that file's existing no-i18n convention).

**i18n (2):** `locales/en/dashboard.json`, `locales/te/dashboard.json` — added `topbar.appSettings`, `settings.*`, `pwaInstall.*` (13 keys incl. nested `iosDialog`).

## 6. CSS/Layout Standards Applied

| Element | Before | After |
|---|---|---|
| Topbar → content panel gap | `gap-3` (12px) | `gap-6` (24px) |
| Devotees/Donations/Campaigns/Users root spacing | `space-y-4` (16px) | `space-y-6` (24px) — now matches every other page |
| Card padding, radii (20px cards, 18px toolbar, 12px inputs) | Already correct (verified in the prior UI-polish pass) | Unchanged |

## 7. Responsive Verification

Automated: full `next build` (zero errors, all ~120 routes incl. the new `/dashboard/settings`), `npx tsc --noEmit` (clean), `npx eslint .` (clean, including the repo-wide `react-hooks/set-state-in-effect` rule — the initial version of `InstallProvider` tripped it; fixed by moving to `useSyncExternalStore`), `npx vitest run` (589/589 passing).

Manual: started the production build (`npm run start`) and confirmed via `curl`: `/login` returns 200 with the correct `<title>`, `/manifest.webmanifest` serves the enhanced manifest JSON, `/sw.js` returns 200.

**Disclosed limitation:** no Playwright/browser tool was available in this session (unlike the prior UI-polish pass), so no viewport screenshots (desktop/tablet/mobile) were taken of the dashboard pages — every dashboard route sits behind Firebase phone-OTP auth that can't be completed headlessly here regardless. Verification relied on the automated checks above plus direct reasoning about each CSS change (documented in §2); a live visual pass is recommended once credentials or a browser tool are available.

## 8. Accessibility Verification

- `InstallButton` renders semantic `Button`/`DropdownMenuItem` elements — keyboard/focus behavior inherited for free from those existing primitives.
- `InstallBanner`'s dismiss control has `aria-label` (localized).
- `InstallDialog` uses the existing `Dialog` primitive (focus trap, `Escape` to close, `DialogTitle`/`DialogDescription` for screen readers — all inherited, not reimplemented).
- No new color-only status indicators: `PWAStatus`'s badge pairs a checkmark icon with text, not color alone.

## 9. Browser Compatibility Report

| Browser | Install path |
|---|---|
| Chrome / Edge (Android, Windows, macOS, Linux) | Native `beforeinstallprompt` → `InstallButton` triggers it directly |
| Safari (iOS/iPadOS) | No `beforeinstallprompt` — UA/touch-point detection routes to `InstallDialog`'s manual "Share → Add to Home Screen" steps |
| Safari (macOS) | No `beforeinstallprompt` support as of this writing; `isIOS` detection is iOS-specific, so macOS Safari currently falls into `"unsupported"` — `PWAStatus` shows the "try Chrome/Edge/iOS Safari" message rather than a silent dead end |
| Firefox (desktop) | No `beforeinstallprompt` support; falls into `"unsupported"`, same honest messaging |

## 10. Before vs After Summary

- **Before:** 12px gap between two 26px-radius cards (topbar/content); 4 pages with a 16px gap between two 22px-radius cards (toolbar/table); two fully duplicated shell components; zero install/PWA affordances anywhere in the app.
- **After:** 24px gaps everywhere two rounded cards stack (exceeds every relevant corner radius, so curves never visually collide); one shared `DashboardFrame` for both shells; a working install system (context, button, banner, iOS dialog, status page, manifest, service worker) reachable from exactly one canonical menu location in both the tenant and Super Admin portals.

## 11. Remaining Recommendations

1. **Live visual verification** once a browser tool or dashboard credentials are available — this pass was verified through build/lint/test tooling and direct CSS reasoning only (see §7).
2. **Manifest screenshots** (`screenshots` field) would enrich the install UI on desktop Chrome, but require real product screenshots this environment doesn't have — recommend capturing a few once the dashboard can be visually exercised.
3. **macOS Safari** has no installability path today (no `beforeinstallprompt`, not detected as iOS) — if Apple ships install-prompt support for macOS Safari, `getIsIOSSnapshot`'s detection would need a macOS-Safari-specific branch; not built speculatively.
4. Two near-duplicate topbars (`DashboardTopbar`/`SuperAdminTopbar`) still remain — the shell duplication was resolved via `DashboardFrame`, but topbar duplication (breadcrumb + account menu, one bilingual, one not by design) was left alone since unifying them would force the Super Admin portal into next-intl against its established convention; flagged rather than silently merged.
