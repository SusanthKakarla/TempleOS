# Folder: lib

## Purpose

The `lib/` folder belongs primarily to the **lib** area and groups 15 direct documented files.

## Responsibilities and Business Module

- Encapsulate Lib behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`countries.ts`](../files/lib/countries.ts.md)
- [`currency.ts`](../files/lib/currency.ts.md)
- [`dashboard-timeseries.test.ts`](../files/lib/dashboard-timeseries.test.ts.md)
- [`dashboard-timeseries.ts`](../files/lib/dashboard-timeseries.ts.md)
- [`date.ts`](../files/lib/date.ts.md)
- [`motion.ts`](../files/lib/motion.ts.md)
- [`pagination.ts`](../files/lib/pagination.ts.md)
- [`phone.mts`](../files/lib/phone.mts.md)
- [`phone.test.mts`](../files/lib/phone.test.mts.md)
- [`phone.test.ts`](../files/lib/phone.test.ts.md)
- [`tenant-domains.test.ts`](../files/lib/tenant-domains.test.ts.md)
- [`tenant-domains.ts`](../files/lib/tenant-domains.ts.md)
- [`url-params.ts`](../files/lib/url-params.ts.md)
- [`use-resolved-theme.ts`](../files/lib/use-resolved-theme.ts.md)
- [`utils.ts`](../files/lib/utils.ts.md)

## Child Folders

- `lib/auth/`
- `lib/campaigns/`
- `lib/cron/`
- `lib/db/`
- `lib/events/`
- `lib/export/`
- `lib/firebase/`
- `lib/i18n/`
- `lib/media/`
- `lib/notifications/`
- `lib/provisioning/`
- `lib/validation/`
- `lib/whatsapp/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
