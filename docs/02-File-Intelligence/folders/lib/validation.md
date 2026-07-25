# Folder: lib/validation

## Purpose

The `lib/validation/` folder belongs primarily to the **Domain** area and groups 26 direct documented files.

## Responsibilities and Business Module

- Encapsulate Validation behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`campaigns.ts`](../../files/lib/validation/campaigns.ts.md)
- [`devotee-families.test.ts`](../../files/lib/validation/devotee-families.test.ts.md)
- [`devotee-families.ts`](../../files/lib/validation/devotee-families.ts.md)
- [`devotee-import.test.ts`](../../files/lib/validation/devotee-import.test.ts.md)
- [`devotee-import.ts`](../../files/lib/validation/devotee-import.ts.md)
- [`devotees.test.ts`](../../files/lib/validation/devotees.test.ts.md)
- [`devotees.ts`](../../files/lib/validation/devotees.ts.md)
- [`donations.test.ts`](../../files/lib/validation/donations.test.ts.md)
- [`donations.ts`](../../files/lib/validation/donations.ts.md)
- [`events.test.ts`](../../files/lib/validation/events.test.ts.md)
- [`events.ts`](../../files/lib/validation/events.ts.md)
- [`temple-faqs.test.ts`](../../files/lib/validation/temple-faqs.test.ts.md)
- [`temple-faqs.ts`](../../files/lib/validation/temple-faqs.ts.md)
- [`temple-sevas.test.ts`](../../files/lib/validation/temple-sevas.test.ts.md)
- [`temple-sevas.ts`](../../files/lib/validation/temple-sevas.ts.md)
- [`temple-social-links.test.ts`](../../files/lib/validation/temple-social-links.test.ts.md)
- [`temple-social-links.ts`](../../files/lib/validation/temple-social-links.ts.md)
- [`temple-special-days.test.ts`](../../files/lib/validation/temple-special-days.test.ts.md)
- [`temple-special-days.ts`](../../files/lib/validation/temple-special-days.ts.md)
- [`temple-time.test.ts`](../../files/lib/validation/temple-time.test.ts.md)
- [`temple-time.ts`](../../files/lib/validation/temple-time.ts.md)
- [`tenant-settings.test.ts`](../../files/lib/validation/tenant-settings.test.ts.md)
- [`tenant-settings.ts`](../../files/lib/validation/tenant-settings.ts.md)
- [`user-import.ts`](../../files/lib/validation/user-import.ts.md)
- [`whatsapp-connect.ts`](../../files/lib/validation/whatsapp-connect.ts.md)
- [`whatsapp-templates.ts`](../../files/lib/validation/whatsapp-templates.ts.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
