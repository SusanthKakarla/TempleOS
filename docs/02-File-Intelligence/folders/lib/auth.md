# Folder: lib/auth

## Purpose

The `lib/auth/` folder belongs primarily to the **Security** area and groups 11 direct documented files.

## Responsibilities and Business Module

- Encapsulate Auth behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`features.ts`](../../files/lib/auth/features.ts.md)
- [`session-live.test.ts`](../../files/lib/auth/session-live.test.ts.md)
- [`session-token.test.ts`](../../files/lib/auth/session-token.test.ts.md)
- [`session-token.ts`](../../files/lib/auth/session-token.ts.md)
- [`session.test.ts`](../../files/lib/auth/session.test.ts.md)
- [`session.ts`](../../files/lib/auth/session.ts.md)
- [`super-admin-session.test.ts`](../../files/lib/auth/super-admin-session.test.ts.md)
- [`super-admin-session.ts`](../../files/lib/auth/super-admin-session.ts.md)
- [`tenant-admin.test.ts`](../../files/lib/auth/tenant-admin.test.ts.md)
- [`tenant-admin.ts`](../../files/lib/auth/tenant-admin.ts.md)
- [`tenant-host.ts`](../../files/lib/auth/tenant-host.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
