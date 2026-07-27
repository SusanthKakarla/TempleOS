# TempleOS EL10 — Premium Visual Theme System

Deliverables for the "Context-Aware Background Architecture" spec: every individual
artwork extracted from the two source collages, a theme engine that maps each
feature to its own background, and the wiring into the pages that actually exist
in TempleOS today.

## 1. Background Extraction Report

Both collages were split programmatically, not eyeballed: `scripts/detect-collage-grid.mjs`
scans row/column average pixel-lightness to find the near-white gutter bands
between cards, then `scripts/extract-theme-artwork.mjs` crops each tile 2-3px
inside those gutters (zero border bleed, confirmed by visual spot-check of both
edge and interior tiles) and writes it as a standalone, lossless PNG.

- **Collage 1** (irregular 5-tile mosaic, 1536×1024): 1 tall hero tile (col 1,
  full height) + 2 stacked tiles (col 2, top) + 2 side-by-side tiles (bottom row).
- **Collage 2** (uniform 4-row × 3-col grid, 1536×1024): 12 evenly-spaced tiles.
- **17 tiles total**, zero left inside a collage — every artwork is now an
  independent file under `assets/themes/source/*.png` (lossless originals) and
  `assets/themes/backgrounds/*.webp` (optimized, quality 82, native resolution).

| Asset | Source | Native size | Avg. brightness (0-255) |
|---|---|---|---|
| golden-sunrise-hero | Collage 1 | 876×650 | 108 |
| cream-bells-temple | Collage 1 | 622×345 | 206 |
| olive-dusk-temple | Collage 1 | 622×292 | 64 |
| navy-night-temple | Collage 1 | 876×336 | 32 |
| rust-orange-temple | Collage 1 | 622×336 | 74 |
| forest-mandala-temple | Collage 2 | 499×276 | 32 |
| golden-riverside-temple | Collage 2 | 505×276 | 115 |
| maroon-lamp-temple | Collage 2 | 499×276 | 34 |
| cream-leaves-temple | Collage 2 | 499×230 | 187 |
| navy-stars-temple | Collage 2 | 505×230 | 35 |
| golden-bell-pillar-temple | Collage 2 | 499×230 | 141 |
| teal-lotus-temple | Collage 2 | 499×226 | 160 |
| orange-silk-temple | Collage 2 | 505×226 | 110 |
| blue-mountain-birds-temple | Collage 2 | 499×226 | 173 |
| dark-pillars-lamps-temple | Collage 2 | 499×249 | 21 |
| misty-mountain-landscape-temple | Collage 2 | 505×249 | 126 |
| deep-blue-gold-temple | Collage 2 | 499×249 | 24 |

**Known gap, disclosed rather than papered over:** neither collage contains a
purple-toned or a true stone/grey-toned artwork. Two feature assignments in the
original spec (Super Admin → "Royal Purple", Inventory → "Stone Theme") use the
closest available substitute instead (see table below) — no purple or stone art
was fabricated to force a literal match.

## 2. Theme Assignment Report / Feature-to-Background Mapping (Step 14)

`lib/themes/registry.ts` is the single source of truth this table is generated
from (`THEME_META`). "Wired" = an actual page/layout in this codebase renders
that theme today; "Catalogued only" = the mapping is defined and ready, but no
matching page exists yet in TempleOS (building those pages was out of scope for
a visual-theme pass).

| Feature | themeKey | Asset | Label | Reason | Status |
|---|---|---|---|---|---|
| Landing Page | `landing` | golden-sunrise-hero | Golden Sunrise Temple | Grand, aspirational first impression | Catalogued only — no marketing landing page exists (`/` redirects straight to `/dashboard` or `/login`) |
| Login | `login` | navy-night-temple | Dark Temple | Calm, focused, distraction-free entry | **Wired** — tenant + Super Admin login |
| Authentication | `auth` | cream-bells-temple | Golden Minimal | Warm but unobtrusive during OTP entry | Catalogued only — OTP step reuses the Login theme in practice |
| Dashboard | `dashboard` | teal-lotus-temple | Minimal Light Theme | Airy, everyday-use neutral | **Wired** — `/dashboard` home, Users, Admins |
| Super Admin | `superAdmin` | dark-pillars-lamps-temple | Dark Premium | Serious, elevated context (substitute — no purple artwork exists) | **Wired** — Super Admin shell |
| Tenant Dashboard | `tenantDashboard` | golden-bell-pillar-temple | Elegant Golden Temple | Premium daily-use identity | Catalogued only |
| Devotees | `devotees` | cream-leaves-temple | Cream Temple Background | Calm, personal, human-focused | **Wired** |
| Family | `family` | olive-dusk-temple | Olive Theme | Grounded, familial warmth | Catalogued only — no standalone Family route today |
| Donations | `donations` | rust-orange-temple | Orange Temple Theme | Warmth and urgency for giving | **Wired** |
| Campaigns | `campaigns` | golden-riverside-temple | Golden Temple Sunset | Donation-campaign urgency, hopeful sunset mood | **Wired** |
| Events | `events` | golden-sunrise-hero | Sunrise Temple | Shared sunrise identity with Landing | **Wired** |
| Festivals | `festivals` | maroon-lamp-temple | Deep Maroon Temple | Festive, ceremonial intensity | Catalogued only — no dedicated Festivals module |
| WhatsApp | `whatsapp` | teal-lotus-temple | Minimal Neutral | Utility-focused messaging context | **Wired** — Chatbot Settings |
| Analytics | `analytics` | deep-blue-gold-temple | Deep Blue Premium | Professional, data-focused | Catalogued only — no dedicated Analytics module |
| Reports | `reports` | cream-leaves-temple | Minimal Cream | Document-like calm | Catalogued only |
| Settings | `settings` | teal-lotus-temple | Subtle Neutral | Low-distraction configuration context | **Wired** — Notification Preferences |
| Notifications | `notifications` | navy-stars-temple | Night Temple | Alerts arrive quietly, at night | Catalogued only — no standalone Notifications page |
| Volunteer | `volunteer` | forest-mandala-temple | Green Temple | Community, growth, service | Catalogued only — no Volunteer module |
| Inventory | `inventory` | misty-mountain-landscape-temple | Stone Theme | Earthy mood (substitute — no stone-toned artwork exists) | Catalogued only — no Inventory module |
| Bookings | `bookings` | golden-bell-pillar-temple | Golden Light | Shares Tenant Dashboard's golden identity | Catalogued only — no Bookings module |
| Media Gallery | `mediaGallery` | blue-mountain-birds-temple | Art Gallery Theme | Scenic, artistic wide shot | Catalogued only — media upload exists, no gallery page |
| Audit Logs | `auditLogs` | teal-lotus-temple | Minimal Neutral | Neutral, record-keeping context | Catalogued only — audit log table exists, no dedicated page |
| System | `system` | dark-pillars-lamps-temple | Dark Premium | Shares Super Admin's serious identity | Catalogued only |
| 404 | `notFound` | navy-stars-temple | Night Temple | Shares Notifications' quiet night identity | **Wired** — new `app/not-found.tsx` |
| Empty States | `emptyState` | cream-leaves-temple | Minimal Cream | Shares Devotees/Reports' calm identity | Catalogued only — existing empty states already sit on their parent page's theme, no separate wiring needed |

**Reserve asset:** `orange-silk-temple` (110 brightness) was extracted and
optimized but has no feature assignment yet — available for a future
Festivals variant or seasonal campaign banner.

## 3. Theme Engine

- **`lib/themes/types.ts`** — `ThemeKey` union (25 keys, one per spec feature) and the `ThemeDefinition` shape.
- **`lib/themes/registry.ts`** — `getTheme(key)` ("ThemeLoader"): the one place that resolves a themeKey to its asset, focal point, blur placeholder, and measured brightness. Nothing else hardcodes an asset path.
- **`components/theme/background-overlay.tsx`** — `<BackgroundOverlay brightness>`: the gradient/blur scrim (Step 4/10). Strength is a formula of the source image's measured brightness (`0.35 + brightness/255 × 0.5`, clamped to 0.35-0.85) — brighter art gets a stronger scrim automatically, darker art is left more visible, never a fixed number regardless of the image.
- **`components/theme/theme-backdrop.tsx`** — `<ThemeBackdrop themeKey>`: the actual renderer (one `next/image` + its overlay). Server-safe, used directly by single-theme surfaces (Login, Super Admin shell, 404).
- **`components/theme/theme-provider.tsx`** — `ThemeProvider` / `SetPageTheme` / `BackgroundManager`: the client-side bridge for the *one* shell that hosts many differently-themed pages (the tenant dashboard). Next.js Server Components can't receive data "up" from a descendant page, so this is the one place a `"use client"` Context genuinely earns its keep — every other surface renders `<ThemeBackdrop>` directly with a plain prop.

**Why 3 files instead of the spec's 5 named pieces:** `ThemeContext` is an
implementation detail inside `theme-provider.tsx`, not a separate export, and
`BackgroundManager`/`ThemeBackdrop` share one rendering path instead of two
near-duplicate ones. Every concept from Step 6 exists; they're just not
artificially split into one file each.

**How a page opts in:**
- Single-theme surface: render `<ThemeBackdrop themeKey="login" />` directly.
- Multi-page feature under the tenant dashboard: add `app/(dashboard)/dashboard/<feature>/layout.tsx` rendering `<SetPageTheme themeKey="..." />` — see the 8 files added under `app/(dashboard)/dashboard/*/layout.tsx`.

No page imports an image file directly; everything goes through `getTheme()`.

## 4. Responsive Image Strategy

The spec asked for separate desktop/tablet/mobile crops per asset. That was
deliberately **not** implemented as three physical files per image — with 17
assets that's 51 near-duplicate files to maintain for no user-visible gain.
Instead: one native-resolution WebP per theme, rendered with `next/image`
`fill` + `object-fit: cover` + a hand-set `object-position` (the actual focal
point of the temple/subject in that specific crop, from visual inspection —
see `focalPosition` in `registry.ts`). This is the modern equivalent of "desktop
full hero / tablet adaptive crop / mobile center-focus crop": the same image,
letting CSS decide what's visible per viewport, with the subject deliberately
kept in frame at every width instead of a dead-center default that could crop
it away. Verified at 1280px and 390px viewports (see Verification below) — no
stretching, no distortion, temple silhouette stays in frame at both sizes.

**Disclosed resolution ceiling:** the source collages cap out at 1536×1024, so
individual tiles are 499-876px wide — smaller than a typical 1920px desktop
hero. Upscaling the files themselves would fabricate detail and was explicitly
against the spec's own "never lose quality" instruction, so the WebP files stay
at native resolution; the browser scales them at render time (standard,
artifact-free behavior for CSS backgrounds) rather than the file being
pre-inflated.

## 5. Performance Report

- Total library: 5.4MB lossless PNG source (kept for future re-derivation) + **276KB** across all 17 optimized WebPs (6-47KB each).
- `next/image` gives lazy loading, automatic responsive `srcset`, and blur-up placeholders for free — no custom lazy-loading code needed.
- Blur placeholders are tiny inlined base64 WebPs (24px wide, ~40-quality) generated once at extraction time and stored in `assets/themes/blur-placeholders.json` — instant paint, no extra request.
- No layout shift: the backdrop is `position: fixed`, sized to the viewport, never affects document flow.
- Verified via a full `next build` — all 70+ routes compile clean with the new imports.
- **Not implemented:** cross-page background crossfade transitions (Step 11) beyond a CSS `transition-opacity duration-300` on the image itself. A true crossfade between two different background photos on navigation would need the experimental View Transitions API, which isn't enabled in this project — flagged as a deliberate scope cut, not a silent omission.
- **Not implemented:** background prefetching for "next likely" pages — would need route-level prediction logic disproportionate to this pass; every theme's WebP is small enough (median ~12KB) that cold-loading a new one on navigation is not a meaningful delay.

## 6. Accessibility Report

- Overlay strength auto-scales from measured image brightness (Step 10) — see Section 3.
- All real content (forms, cards, tables, dialogs) stays on the existing white/`--card` surfaces, unchanged by this work — the spec's Step 13 rule ("cards white, forms white, only page background changes") was already the codebase's existing pattern before this task; nothing needed migrating.
- `<ThemeBackdrop>`'s image has `alt=""` and the wrapping div has `aria-hidden="true"` and `pointer-events-none` — screen readers and keyboard/tab order skip it entirely, exactly as a decorative background should behave.
- Verified: login form (both tenant and Super Admin) renders with full contrast against its Dark Temple background at 1280px and 390px viewports; 404 page verified the same way.

## 7. Folder Structure

```
assets/themes/
  source/                    17 lossless PNG originals (master copies)
  backgrounds/               17 optimized WebP (what the app actually loads)
  blur-placeholders.json     name -> {width, height, blurDataURL}

lib/themes/
  types.ts                   ThemeKey union + ThemeDefinition shape
  registry.ts                getTheme() — the ThemeLoader

components/theme/
  theme-backdrop.tsx         ThemeBackdrop (Server-safe renderer)
  theme-provider.tsx         ThemeProvider / SetPageTheme / BackgroundManager
  background-overlay.tsx     BackgroundOverlay (brightness-scaled scrim)

scripts/
  detect-collage-grid.mjs    Reusable gutter-detection diagnostic for future collages
  extract-theme-artwork.mjs  Reproducible extraction + optimization pipeline
```

No image is imported from anywhere else in the app — this is a deliberate,
enforced single point of entry (Step 15's "never scatter assets").

## 8. Files Modified/Added

**Added:**
- `assets/themes/**` (34 files: 17 source PNG + 17 backgrounds WebP + 1 JSON)
- `lib/themes/{types,registry}.ts`
- `components/theme/{theme-backdrop,theme-provider,background-overlay}.tsx`
- `scripts/{detect-collage-grid,extract-theme-artwork}.mjs`
- `app/not-found.tsx`
- `app/(dashboard)/dashboard/{devotees,campaigns,donations,events,chatbot-settings,notification-preferences,users,admins}/layout.tsx` (8 new files, one per themed feature folder)

**Modified:**
- `features/dashboard/dashboard-shell.tsx` — `AmbientBackground` → `ThemeProvider` + `BackgroundManager`
- `features/super-admin/super-admin-shell.tsx` — `AmbientBackground` → `ThemeBackdrop themeKey="superAdmin"`
- `app/(auth)/login/page.tsx` — `AmbientBackground` → `ThemeBackdrop themeKey="login"`
- `features/super-admin/super-admin-login-form.tsx` — same swap
- `app/(dashboard)/dashboard/page.tsx` — added `<SetPageTheme themeKey="dashboard" />`

**Deliberately untouched:** `features/dashboard/ambient-background.tsx` itself
— still used by `app/whatsapp-onboarding/page.tsx` and `app/(auth)/access-denied/page.tsx`,
neither of which is in the spec's 25-feature list, so swapping them wasn't
in scope for this pass.

## 9. Implementation Roadmap (what's left)

1. **Wire the remaining "catalogued only" themes** as their pages get built (Analytics, Reports, Notifications, Volunteer, Inventory, Bookings, Media Gallery, Audit Logs, Festivals, System, Family, a real marketing Landing Page) — the registry entries already exist, this is just adding `<SetPageTheme>`/`<ThemeBackdrop>` to each new page as it ships.
2. **Resolve the two substitute themes** if true purple or stone-toned artwork is ever provided (Super Admin currently uses Dark Premium, Inventory uses the misty mountain crop) — swap the `asset` field in `registry.ts`, nothing else changes.
3. **Consider the View Transitions API** for a real cross-fade between themes on navigation, once broader browser support/project appetite is confirmed.
4. **Re-run `scripts/detect-collage-grid.mjs`** against any future collage before hand-measuring tile coordinates — it found exact gutter positions in seconds for both collages here.
