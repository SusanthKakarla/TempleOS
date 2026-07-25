# Deployment Architecture

*(New document — not present in the root handbook.)*

## Hosting

- **Application**: Railway (inferred from `.env.example`'s "Railway Postgres" comment and the `WHATSAPP_ONBOARDING_ORIGIN`/cron references throughout the codebase — no explicit `railway.json`/`railway.toml` exists in the repo, so scheduling and service config are managed entirely through Railway's dashboard, not checked into source).
- **Database**: Railway-hosted PostgreSQL, connected via `DATABASE_URL` (`lib/db/pool.ts`).
- **No CI configuration exists** — `.github/` does not exist in this repo. `npm run lint`/`npm run typecheck`/`npm test` are available as scripts but nothing invokes them automatically on push/PR. See [Configuration-Audit.md](./Configuration-Audit.md).

## Build & start (`package.json` scripts)

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Local development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Production server (what Railway presumably runs after build) |
| `lint` | `eslint` | Flat-config ESLint (Next core-web-vitals + TypeScript rules) |
| `typecheck` | `tsc --noEmit` | Type-check only, no output |
| `test` | `vitest run` | Full test suite (node environment) |
| `migrate` | `tsx scripts/migrate.mts` | Manual migration runner — **not automatic on deploy** |
| `seed` | `tsx scripts/seed.mts` | Idempotent first-Super-Admin bootstrap |
| `provision:temple` | `tsx scripts/provision-temple.mts` | CLI temple provisioning (alternative to the Super Admin UI wizard) |
| `seed:super-admin` | `node scripts/seed-super-admin.mjs` | Standalone JS variant of the super-admin seed (no `tsx` dependency) |
| `auth:clear-firebase` | `tsx scripts/clear-person-firebase-uid.mts` | Ops utility to unbind a Firebase UID |

**Deploy-time gap worth knowing**: since `migrate` is a separate manual script, a deploy that ships code depending on a new column/table (e.g. this session's `submission_guide` column) will fail at runtime until someone runs `npm run migrate` against the production database by hand. This already happened once this session — see [WhatsApp-Architecture.md](./WhatsApp-Architecture.md) for the incident.

## Runtime configuration

- `next.config.ts` — minimal: `experimental.authInterrupts: true` (enables `forbidden()`/`unauthorized()` from `next/navigation`, used throughout the auth guards) plus the `next-intl` plugin wrapper reading `./i18n/request.ts`.
- No custom server, no Edge Middleware (`middleware.ts` absent by design — see [Layer-Architecture.md](./Layer-Architecture.md)).
- Node engine pinned: `"node": "24.x"` in `package.json`.

## Environment variables required at boot

See [Environment-Variables.md](./Environment-Variables.md) for the full row-by-row list. At minimum, `DATABASE_URL` and `SESSION_SECRET` are load-bearing for any request to succeed; Firebase, WhatsApp, and ImageKit vars are load-bearing only for the features that touch those integrations, but are not validated at boot — a misconfigured deploy fails at first use, not at startup.

## Cross-references

[Environment-Variables.md](./Environment-Variables.md) · [Configuration-Audit.md](./Configuration-Audit.md) · [Cron-Architecture.md](./Cron-Architecture.md) for how Railway's scheduler is the only "worker" this app has.
