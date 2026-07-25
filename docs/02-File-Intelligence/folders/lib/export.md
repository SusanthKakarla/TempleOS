# Folder: lib/export

## Purpose

The `lib/export/` folder belongs primarily to the **Export** area and groups 9 direct documented files.

## Responsibilities and Business Module

- Encapsulate Export behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`download-client.ts`](../../files/lib/export/download-client.ts.md)
- [`index.test.ts`](../../files/lib/export/index.test.ts.md)
- [`index.ts`](../../files/lib/export/index.ts.md)
- [`pdf.test.ts`](../../files/lib/export/pdf.test.ts.md)
- [`pdf.ts`](../../files/lib/export/pdf.ts.md)
- [`response.ts`](../../files/lib/export/response.ts.md)
- [`types.ts`](../../files/lib/export/types.ts.md)
- [`workbook.test.ts`](../../files/lib/export/workbook.test.ts.md)
- [`workbook.ts`](../../files/lib/export/workbook.ts.md)

## Child Folders

- `lib/export/columns/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
