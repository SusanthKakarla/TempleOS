# TempleOS Brand Identity — Guidelines & Integration Report

The approved TempleOS logo (a circular tree/temple/devotee emblem + "TempleOS"
wordmark) is now the single source of truth for branding across the app,
replacing the generic `lucide-react` `Landmark` icon that stood in for it
everywhere. This doc is both the brand guideline and the record of what
changed.

## 1. Branding Audit (before this work)

| Area | Before |
|---|---|
| `public/` | Only the default `create-next-app` starter SVGs (file/globe/next/vercel/window) — no custom branding |
| `app/favicon.ico` | The stock Next.js default ICO, not a TempleOS mark |
| `app/layout.tsx` metadata | Just `title`/`description` — no `icons`, `manifest`, `themeColor`, `openGraph`, `twitter` |
| Manifest / PWA | None — no `manifest.json`, no Apple/Android/maskable icons |
| Tenant sidebar, Super Admin sidebar, marketing header/footer | All used the same pattern: a `Landmark` lucide icon inside a colored gradient chip (`gradient-ocean-blue` in sidebars, `gradient-saffron-gold` in marketing header/footer) |
| Tenant login (`tenant-login-form.tsx`) | `Landmark` icon in a `gradient-saffron-gold` chip above the title |
| Super Admin login (`super-admin-login-form.tsx`) | **No branding at all** — just a "Platform Console" badge and title |
| Email | TempleOS sends no emails today (no `nodemailer`/`resend`/`@react-email` in the codebase) — nothing to brand |
| PDF export | `lib/export/pdf.ts` (via `pdfkit`) generates generic tabular reports (devotees/donations/events/etc. exports) — no donation-receipt-specific PDF exists to brand |

No duplicate or conflicting logo files existed — the gap was a total absence
of the approved mark, not a cleanup problem.

## 2. Logo Extraction & Variants

The source file (`TEMPLEOS LOGO.png`, 1254×1254, opaque white background) was
processed into a transparent master, then every variant below was derived
from that one file — nothing was redrawn, restretched, or recolored by hand.

**Background removal** (`scripts/remove-logo-background.mjs`): thresholds
were measured directly from the file, not guessed. Background pixels sit at
min-channel 253-255 (a few levels of paper-grain texture baked into the
artwork); genuine edge anti-aliasing at shape boundaries dips through
roughly 200-252 over 1-2px. An initial naive "close to white" cutoff around
248 caught that background grain as if it were edge detail, producing
visible speckle once composited on a dark surface — worth noting because it's
an easy mistake to repeat if this ever needs re-running by hand.

**Variants generated** (`scripts/generate-brand-assets.mjs`, all under `assets/brand/`):

| Asset | What |
|---|---|
| `logo/templeos-logo-full.{png,webp,svg}` | Emblem + wordmark, transparent, tightly cropped (902×1149) |
| `icon/templeos-icon.{png,webp,svg}` | Emblem only, square (1024×1024) — the wordmark is illegible below ~150px anyway, so small contexts (sidebar, favicon) use this instead of "shrinking" the full lockup |
| `icon/templeos-icon-mono-black.png` | Single-color black, shape/alpha preserved — for contexts where the multi-color mark would clash |
| `icon/templeos-icon-mono-white.png` | Single-color white, same |
| `source/templeos-logo-original.png`, `source/templeos-logo-transparent.png` | The untouched original and the background-removed master everything else derives from |

**Not generated, disclosed rather than faked:**
- **True vector SVG** — the source is a painterly/textured raster illustration (gradients, paper grain), not flat vector shapes. Auto-tracing it into real vector paths would meaningfully change its look (blocky, flattened) — that's redesigning the logo, which was explicitly off-limits. The `.svg` files that do exist are raster-embedded wrappers (`<svg><image href="data:image/png;base64,...">`) — valid SVG containers, honestly not vector paths of the artwork.
- **True print/CMYK version** — the source tops out at 1254×1254 @ 72dpi with no CMYK profile. Upscaling would fabricate detail; the highest-resolution PNG (1024×1024 icon / 902×1149 full lockup) is the ceiling available without regenerating the source art at higher resolution.

## 3. Favicon / PWA / Icon Integration

All generated into `public/` (where browsers/OSes expect fixed, well-known filenames) from the icon variant:

| File | Size | Purpose |
|---|---|---|
| `favicon.ico` | 16/32/48 (hand-built ICO container — sharp can't emit `.ico`; modern readers accept embedded PNG frames directly, so no extra dependency was needed) |
| `favicon.svg` | — | Modern browsers, also used as the Safari `mask-icon` |
| `favicon-16x16.png` / `-32x32.png` / `-48x48.png` | | Explicit sized favicons |
| `apple-touch-icon.png` | 180×180 | Flattened onto the brand background color (iOS renders transparency as black otherwise) |
| `android-chrome-192x192.png` / `-512x512.png` | | Standard Android/PWA icons |
| `maskable-icon-192x192.png` / `-512x512.png` | | Content kept within the inner ~70% safe zone per the [maskable icon spec](https://w3c.github.io/manifest/#dfn-maskable-icons), so an OS circle/squircle mask never clips the tree/temple silhouette |
| `mstile-150x150.png` + `browserconfig.xml` | 150×150 | Windows tile |
| `og-image.png` | 1200×630 | Open Graph / Twitter card — logo centered on the brand background |

**Disclosed limitation:** the emblem is ornate (individual leaves, tree branches, devotee silhouettes, temple architecture) — at 16-32px it reads as a recognizable colored circular badge, not with full detail. That's an inherent tradeoff of using this specific mark at favicon scale, not a generation defect; "simplifying" it further would mean redesigning the approved logo, which wasn't authorized.

## 4. Next.js Metadata (`app/layout.tsx`, `app/manifest.ts`)

- `metadata.icons` — all favicon sizes + apple touch icon + mask-icon (favicon.ico itself is left out of this list since Next.js auto-detects `public/favicon.ico` via its own file convention; listing it again would just duplicate the `<link>` tag).
- `metadata.openGraph` / `metadata.twitter` — title/description/the new `og-image.png`.
- `metadata.other` — `msapplication-config`/`msapplication-TileColor` for the Windows tile.
- `viewport.themeColor` — a light/dark pair (`#f8fafc` / `#090d16`), computed from the app's actual `--background` token values (not guessed hex).
- `app/manifest.ts` — the Next.js file-convention manifest (auto-served at `/manifest.webmanifest`, auto-linked): name/short_name/icons/theme_color/start_url.

Verified live: all icon `<link>` tags render correctly, `favicon.ico` and `/manifest.webmanifest` both return 200 with correct content (checked via Playwright against a production build).

## 5. Design Tokens (`lib/brand/tokens.ts`, `components/brand/brand-mark.tsx`)

```ts
brand.name        // "TempleOS"
brand.logo.full    // emblem + wordmark (StaticImageData)
brand.logo.icon    // emblem only, square
brand.logo.iconMonoBlack / iconMonoWhite
brand.minSizePx    // 24 — below this the emblem's detail stops reading
```

`<BrandMark variant="icon" | "full" | "icon-mono-black" | "icon-mono-white" size={px} />`
is the **only** component that renders the logo — every integration point
below imports this, never a raw `<Image src="...">` pointed at a brand asset
file directly. Regenerating the source logo only ever means re-running
`node scripts/generate-brand-assets.mjs`; no consuming code changes.

## 6. Where It's Wired In

| Surface | Before | After |
|---|---|---|
| Tenant dashboard sidebar (`features/dashboard/app-sidebar.tsx`) | `Landmark` in a `gradient-ocean-blue` chip | `<BrandMark variant="icon" size={32} />` |
| Super Admin sidebar (`features/super-admin/super-admin-sidebar.tsx`) | Same pattern | Same swap (the `Landmark` icon used for the "Temples" nav item elsewhere in the same file was left untouched — that's a nav icon, not branding) |
| Marketing header/footer (`components/site-header.tsx`, `site-footer.tsx`) | `Landmark` in `gradient-saffron-gold` chips | `<BrandMark variant="icon" size={28} />` |
| Tenant login (`features/auth/tenant-login-form.tsx`) | `Landmark` chip, size-10 | `<BrandMark variant="icon" size={56} />` — bigger, centered, matching Step 8's "premium hero" instruction |
| Super Admin login (`features/super-admin/super-admin-login-form.tsx`) | **Nothing** | `<BrandMark variant="icon" size={44} />` added above the "Platform Console" badge |
| 404 (`app/not-found.tsx`) | Didn't exist | New page, centered `<BrandMark size={56} />` + message + "Back to TempleOS" button |

**Not touched:** `app/whatsapp-onboarding/page.tsx` and `app/(auth)/access-denied/page.tsx` still use the generic `AmbientBackground` decorative blobs with no logo — neither was named in scope for this pass; flagged here rather than silently left inconsistent.

**Email / PDF branding (Steps 10-11 of the spec):** not implemented — TempleOS sends no emails and has no donation-receipt PDF today (confirmed in the audit above), so there was nothing concrete to brand. `brand.logo.full`/`brand.logo.icon` are ready to drop into either the moment those features exist.

## 7. Brand Guidelines

**Minimum size:** 24px for the icon mark alone; below that, use text-only ("TempleOS") rather than a barely-legible icon.

**Safe area:** keep at least 15% of the mark's own width as clear space on every side — don't crop tight against adjacent UI (the generated assets already have this padding baked in via the crop scripts).

**Correct usage:**
- Full-color icon (`variant="icon"`) for anything on a light or white surface — sidebar, header, standard login.
- Monochrome black/white (`variant="icon-mono-black"`/`"icon-mono-white"`) only where a full-color mark would visually clash — e.g. a solid-color banner, a watermark over a photo.
- Full lockup (`variant="full"`) only where there's real room to breathe — a login hero, a print document, marketing. Never shrunk into a small chip (the wordmark becomes illegible well before the icon does).

**Incorrect usage:**
- Never stretch, skew, recolor, or crop into the artwork itself (Step 2's explicit rule — nothing in this integration violates it; all crops stop at the transparent gutter around the mark, never into the emblem or wordmark).
- Never place the full-color mark directly on a busy photographic background without a solid card/surface behind it — it was designed against a flat background.
- Never recreate it as inline SVG paths/an icon font glyph — always render the approved raster asset via `<BrandMark>`.

**Dark mode:** the full-color icon already reads correctly on both the light (`#f8fafc`) and dark (`#090d16`) app backgrounds — verified visually at both the sidebar and login. No separate dark-mode variant was needed; the mono-white variant exists for edge cases (e.g., an accent-colored surface) rather than for dark mode generally.

## 8. Folder Structure

```
assets/brand/
  source/    templeos-logo-original.png, templeos-logo-transparent.png
  logo/      templeos-logo-full.{png,webp,svg}
  icon/      templeos-icon.{png,webp,svg}, templeos-icon-mono-{black,white}.png

lib/brand/tokens.ts              brand.* design tokens
components/brand/brand-mark.tsx  <BrandMark> — the only logo renderer

public/
  favicon.ico, favicon.svg, favicon-{16,32,48}x{16,32,48}.png
  apple-touch-icon.png
  android-chrome-{192,512}x{192,512}.png
  maskable-icon-{192,512}x{192,512}.png
  mstile-150x150.png, browserconfig.xml
  og-image.png

app/manifest.ts                  PWA manifest (Next.js file convention)

scripts/
  remove-logo-background.mjs     Reusable — measures + strips a flat-color background
  generate-brand-assets.mjs      Reproducible pipeline: source -> every variant + public/ icon set
```

## 9. Implementation Roadmap (what's left)

1. **Email branding** — once TempleOS actually sends email (welcome/receipt/notification), use `brand.logo.full` in the template header; nothing to build until that feature exists.
2. **PDF branding** — `lib/export/pdf.ts`'s report header currently has no logo; adding `assets/brand/icon/templeos-icon.png` to its `PDFDocument.image()` call is a small, isolated follow-up (not done here to avoid touching the export pipeline's tested output shape in the same pass as the visual-identity work).
3. **`app/whatsapp-onboarding` and `app/(auth)/access-denied`** — still on the old generic `AmbientBackground`; bring them in line with the rest once/if they're back in scope.
4. **WhatsApp branding** — the spec mentions "WhatsApp Branding where appropriate"; TempleOS's WhatsApp messages are plain text/template messages (no image header today), so there's no current send path to attach a logo image to. Flagged, not built.
