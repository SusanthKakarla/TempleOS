# Folder: features/events

## Purpose

The `features/events/` folder belongs primarily to the **Events** area and groups 6 direct documented files.

## Responsibilities and Business Module

- Encapsulate Events behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`announce-dialog.tsx`](../../files/features/events/announce-dialog.tsx.md)
- [`date-time-field.tsx`](../../files/features/events/date-time-field.tsx.md)
- [`datetime-local.ts`](../../files/features/events/datetime-local.ts.md)
- [`event-card.tsx`](../../files/features/events/event-card.tsx.md)
- [`event-form-dialog.tsx`](../../files/features/events/event-form-dialog.tsx.md)
- [`events-table.tsx`](../../files/features/events/events-table.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
