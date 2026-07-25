# Developer Guide

## Setup

1. Install Node 24.x and PostgreSQL 16.
2. Run `npm install`.
3. Copy `.env.example` to ignored `.env.local` and populate secrets.
4. Run `npm run migrate`, `npm run seed`, and provision a super admin/tenant.
5. Run `npm run dev`.

## Quality Commands

- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Common Workflows

- Add APIs under `app/api/<domain>/route.ts`; authenticate, authorize, validate, then delegate.
- Add persistence under `lib/db/<domain>.ts`; require tenant identifiers for tenant data.
- Add forward SQL migrations; never edit an applied migration without an explicit compatibility plan.
- Add reusable UI to `components/` and domain UI to `features/<domain>/`.
- Add translations to both supported locale trees when introducing user-facing text.

## Deployment

The repository targets a dynamic Next.js server with PostgreSQL and scheduled HTTP cron calls. Configure all server secrets, apply migrations before serving new code, verify provider webhooks, and run the production build in CI.
