# TempleOS Design Philosophy — Midnight Blue

## Tone

Calm, reverent, and effortless. TempleOS should feel like walking into a well-kept temple office — orderly, welcoming, and unhurried. Devotees of every age and language should understand where to go within seconds, whether they came to check timings, watch a live darshan, or make an offering. Not a tech product, not a portal — a quiet digital extension of the temple itself.

## Principles

**Mobile-first** — Most devotees arrive on a phone, often on a slow connection. Design the small screen first; the desktop is the same content given room to breathe. Every primary action must be reachable with one thumb.

**Minimal** — Every element earns its place. No decorative sections, no filler, no feature added because it's possible. If removing something doesn't hurt the page, remove it. A devotee looking for tomorrow's timings should not have to scroll past a carousel.

**Multilingual by default** — Language is a first-class concern, not an afterthought. The same layout renders in English and Telugu today, with Hindi and Tamil on the same structure. One tap in the header switches everything. Never hard-code text into images or layouts that only fit Latin script.

**Trust** — Copy is plain and honest: timings, dates, addresses, amounts. No hype. The site states what it is and gets out of the way, so the temple — not the interface — is what devotees remember.

**Action-oriented** — Get the visitor to the useful next step fast: watch live, see the next event, get directions, donate. Every screen has one clear primary action.

## Visual Identity

**Palette — Midnight Blue**
- `#F7FAFC` cool off-white — page background (canvas). Airy, spacious, tech-forward without feeling cold.
- `#FFFFFF` pure white — cards, surfaces, the header on scroll.
- `#1A365D` midnight blue — primary. Navigation, headings, active states, sacred iconography.
- `#FF9933` deep marigold — accent. Reserved for the single most important action on a screen (Donate, Watch Live) and high-priority alerts. Used sparingly so it always means "act here."
- `#1A202C` deep slate — body text. Maximum contrast against the cool background.
- `#64748B` slate muted — secondary text, captions, timestamps.
- `#E2E8F0` hairline — borders and dividers.

**Contrast rule** — Marigold is bright; text sitting *on* marigold must be deep slate (`#1A202C`), never white. Text on midnight blue is white. Never place marigold text on the off-white background at body size — reserve it for large labels and icons only.

**Shade note** — Midnight (`#1A365D`) is the baseline. The deck brackets it with Ink Navy (`#0E2038`, deepest), Denim (`#2B4E86`, more saturated) and Slate Haze (`#4E6E96`, softest). Whichever ships, keep the marigold accent constant so the brand reads consistently.

**Typography**
- Headings: **Playfair Display** (serif) — ceremonial and warm; gives temple names and section titles a sense of occasion. Telugu headings: **Noto Serif Telugu**.
- Body / UI: **Noto Sans** — clean, neutral, and — critically — part of the Noto family, so it renders English, Telugu, Hindi and Tamil from one type system with matching metrics. Telugu body: **Noto Sans Telugu**.
- Never substitute a Latin-only font (Inter, Roboto, Arial). Multilingual coverage is a hard requirement, and Noto guarantees it.

## Layout

- Mobile: single column, `16px` side gutters, `44px` minimum hit targets, fixed bottom tab bar (Home · Events · Sevas · About).
- Desktop: max content width `1200px`, three-up card grid for the home dashboard, generous vertical rhythm.
- Strong whitespace — let content breathe; cards separated by real gaps, not borders alone.
- Section label pattern: small marigold square/rule + uppercase tracked label to orient without a heavy heading.
- Hero: full-bleed temple photograph with a dark scrim, so the welcome line and primary actions stay legible over any image.

## Component Conventions

- **Cards**: `background:#FFFFFF; border:1px solid #E2E8F0; border-radius:16px`. Soft shadow on hover for tappable cards; static cards stay flat.
- **Primary button**: `background:#FF9933; color:#1A202C; border-radius:12px`, bold label. One per screen.
- **Secondary button**: `border:1.5px solid #1A365D; color:#1A365D`, transparent fill; fills to midnight on hover.
- **Top nav (desktop)**: solid midnight `#1A365D` bar, white links, marigold Donate button, language switcher as an outlined pill.
- **Bottom tab bar (mobile)**: white surface, top hairline, four icons; active icon in midnight, inactive in muted slate.
- **Event row**: date chip (marigold month, slate day) + title + time + category pill. The core repeating unit across Home and Events.
- **Language switcher**: outlined pill in the header showing the current language (`EN` / `తెలుగు`), one tap to change. Present on every screen.

## Recommended Stack

- **Framework**: React (the existing TempleOS admin is already React) with Next.js for the public site — server rendering matters for fast first paint on mobile and for SEO on event/temple pages.
- **Styling**: Tailwind CSS with the palette above set as theme tokens (`--color-midnight`, `--color-marigold`, etc.). Utility-first keeps the bundle small and the design consistent.
- **Components**: shadcn/ui primitives with Tailwind overrides — no heavyweight component library. Recolor to the palette; don't ship generic blue.
- **Icons**: Lucide (line icons) — neutral weight that pairs well with the calm palette; tint midnight or marigold as needed.
- **Internationalization**: `next-intl` (or `i18next`) with message catalogs per language. Telugu already exists in the codebase — reuse those strings. Never concatenate translated fragments; keep whole phrases in the catalog.
- **Fonts**: self-host the Noto family + Playfair Display via `next/font` for reliable multilingual glyph coverage and no layout shift.
- **Media**: `next/image` for temple photography (responsive, lazy, blur-up). A lightweight embedded player (YouTube/HLS) for live darshan — don't build a custom player.
- **Dates & timings**: a small date library (`date-fns`) with locale support so timings and festival dates format correctly per language.

## What to Avoid

- Generic AI / SaaS aesthetics: no gradient blobs, no purple-blue tech gradients, no glassmorphism.
- Marigold overuse: if two things on a screen are marigold, one of them is wrong. It marks the single primary action.
- White text on marigold, or marigold text at body size on the light background — both fail contrast.
- Latin-only fonts or text baked into images — breaks multilingual support.
- Overloaded navigation: mobile has four tabs, desktop has four links plus Donate. Resist adding more.
- Deep-linking devotees into dead ends: every screen offers a clear way forward (watch, directions, next event, donate).

---

## Admin Dashboard Principles

The dashboard is used by temple staff and administrators — often on a phone, between other duties. Apply the same mobile-first constraint, but the goal here is speed and clarity for repeated use rather than first impressions.

### Layout

**No nested containers.** Tab panels, form sections, and data tables do not need a card wrapper just because they exist. The tab itself is the container. Wrapping content in a `Card` inside a `SettingsSection` inside a tab panel is three levels of indentation for no organisational gain — it eats horizontal space on mobile and adds visual noise. Render flat.

**No collapsible wrappers around full-page content.** A collapsible that wraps 100% of a settings page just adds a mandatory tap before the user can do anything. Use tabs for organisation; only use collapsibles when a section is genuinely optional or advanced and its default-closed state is the right default for most users.

**Consolidate related features into one place.** Don't split related UI across the page based on state (e.g. showing a connection card above settings when disconnected and below when connected). Put it in the tab where it belongs and keep it there always.

### Content

**Remove subtitle text that restates the obvious.** `PageHeader` subtitles like "Changes take effect immediately, no deployment needed" are noise for repeat users. If the information is genuinely important, it belongs closer to the field it describes, not in a header above unrelated content.

**Don't add context banners that duplicate the UI.** A "Connect your WhatsApp first" prompt banner above a connection card is redundant — the card already communicates the unconnected state. One surface per concept.

### Navigation

**Scrollable tab lists need a visible overflow hint.** When a `TabsList` can scroll horizontally, add a right-edge fade gradient (`pointer-events-none absolute right-0 bg-gradient-to-l from-background`) so users know there are more tabs off-screen. Never rely on hidden scrollbars alone.

**Section headings within a tab panel** use `font-heading text-sm font-semibold`. Plain `font-medium` at the same size as body text doesn't create enough hierarchy — the heading has to read as a heading without being large.

**Section dividers between groups within a tab** use a simple `<div className="border-t" />` — not a new card, not a heading with a background, not a collapsible. The separation cue should be as quiet as possible while still being visible.

### Forms

**The Save button belongs at the bottom of the form, not in a CardFooter.** When there is no card, place the submit button as the last element in the `<form>`. No `form`+`id` split pattern unless the form genuinely wraps elements outside a natural parent.

**Each tab panel section that has a title and description** renders them as:
```tsx
<p className="font-heading text-sm font-semibold">{title}</p>
<p className="text-sm text-muted-foreground">{description}</p>
```
Not as `CardTitle`/`CardDescription` — those imply a Card surface.

