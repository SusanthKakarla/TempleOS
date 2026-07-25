# Configuration Audit

*(New document — not present in the root handbook.)*

## `package.json`

- Node engine pinned: `"node": "24.x"`.
- Framework versions actually installed (verified directly, not assumed): **Next.js 16.2.10**, **React 19.2.4** — the root handbook's Executive Summary says "Next.js 15," which is stale; see [Project-Overview.md](./Project-Overview.md).
- Notable dependencies: `@base-ui/react` (the shadcn base for `components.json`'s `"style": "base-nova"` — this is a **base-ui**, not Radix, shadcn variant), `firebase` + `firebase-admin` (auth), `pg` (raw Postgres driver, no ORM), `zod` (validation), `exceljs`/`pdfkit` (export), `imagekit` (media), `next-intl` (i18n), `recharts` (dashboard charts), `sonner` (toasts), `framer-motion` (animation).
- Scripts: see [Deployment-Architecture.md](./Deployment-Architecture.md) for the full table.

## `tsconfig.json`

- `strict: true`, `target: ES2017`, `moduleResolution: "bundler"`, `allowImportingTsExtensions: true`.
- Path alias: `"@/*": ["./*"]` — the single alias used throughout the codebase (`lib/db/pool.ts` imported as `@/lib/db/pool`, etc.), also mirrored in `vitest.config.ts`'s `resolve.alias`.
- Includes `**/*.mts` — the `scripts/` directory's TypeScript files type-check alongside the app.

## `next.config.ts`

Minimal: `experimental.authInterrupts: true` (enables `forbidden()`/`unauthorized()` from `next/navigation` — load-bearing for the auth guards described in [Authentication-Architecture.md](./Authentication-Architecture.md) and the confirmed-not-dead `app/forbidden.tsx` convention file) wrapped with `next-intl`'s plugin reading `./i18n/request.ts`.

## `eslint.config.mjs`

Flat config: `eslint-config-next`'s `core-web-vitals` + `typescript` rule sets, with default Next ignores (`.next/**`, `out/**`, `build/**`, `next-env.d.ts`) explicitly re-declared via `globalIgnores`. This is also where the `react-hooks/set-state-in-effect` rule (React Compiler lint rule) comes from — it fired once this session against an early draft of `whatsapp-template-setup-wizard.tsx` and was fixed by switching to a mount-key-remount pattern rather than a controlled `open` prop.

## `vitest.config.ts`

`environment: "node"` (no jsdom/happy-dom — consistent with there being zero component-render tests anywhere in the repo, see [Testing-Architecture.md](./Testing-Architecture.md)). Same `@/` alias as `tsconfig.json`.

## `components.json` (shadcn)

`"style": "base-nova"` on `@base-ui/react` (not Radix), `rsc: true`, `baseColor: "neutral"`, `cssVariables: true`, `prefix: ""`, `iconLibrary: "lucide"`. Tailwind config points at `app/globals.css` directly (`"config": ""`) — Tailwind v4's CSS-based config, no `tailwind.config.js` exists.

## No CI configuration

`.github/` does not exist anywhere in the repo. `lint`/`typecheck`/`test` npm scripts exist but nothing invokes them automatically on push or PR — verification today is entirely manual (or delegated to whoever runs these commands before pushing, as this session did for the WhatsApp Phase 2 work).

## Cross-references

[Deployment-Architecture.md](./Deployment-Architecture.md) · [Environment-Variables.md](./Environment-Variables.md) · [Project-Overview.md](./Project-Overview.md)
