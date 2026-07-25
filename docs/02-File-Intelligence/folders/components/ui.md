# Folder: components/ui

## Purpose

The `components/ui/` folder belongs primarily to the **Presentation** area and groups 29 direct documented files.

## Responsibilities and Business Module

- Encapsulate Ui behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`alert-dialog.tsx`](../../files/components/ui/alert-dialog.tsx.md)
- [`alert.tsx`](../../files/components/ui/alert.tsx.md)
- [`avatar.tsx`](../../files/components/ui/avatar.tsx.md)
- [`badge.tsx`](../../files/components/ui/badge.tsx.md)
- [`breadcrumb.tsx`](../../files/components/ui/breadcrumb.tsx.md)
- [`button.tsx`](../../files/components/ui/button.tsx.md)
- [`calendar.tsx`](../../files/components/ui/calendar.tsx.md)
- [`card.tsx`](../../files/components/ui/card.tsx.md)
- [`checkbox.tsx`](../../files/components/ui/checkbox.tsx.md)
- [`collapsible.tsx`](../../files/components/ui/collapsible.tsx.md)
- [`dialog.tsx`](../../files/components/ui/dialog.tsx.md)
- [`dropdown-menu.tsx`](../../files/components/ui/dropdown-menu.tsx.md)
- [`input.tsx`](../../files/components/ui/input.tsx.md)
- [`label.tsx`](../../files/components/ui/label.tsx.md)
- [`labeled-input.tsx`](../../files/components/ui/labeled-input.tsx.md)
- [`popover.tsx`](../../files/components/ui/popover.tsx.md)
- [`progress.tsx`](../../files/components/ui/progress.tsx.md)
- [`scroll-area.tsx`](../../files/components/ui/scroll-area.tsx.md)
- [`select.tsx`](../../files/components/ui/select.tsx.md)
- [`separator.tsx`](../../files/components/ui/separator.tsx.md)
- [`sheet.tsx`](../../files/components/ui/sheet.tsx.md)
- [`sidebar.tsx`](../../files/components/ui/sidebar.tsx.md)
- [`skeleton.tsx`](../../files/components/ui/skeleton.tsx.md)
- [`sonner.tsx`](../../files/components/ui/sonner.tsx.md)
- [`switch.tsx`](../../files/components/ui/switch.tsx.md)
- [`table.tsx`](../../files/components/ui/table.tsx.md)
- [`tabs.tsx`](../../files/components/ui/tabs.tsx.md)
- [`textarea.tsx`](../../files/components/ui/textarea.tsx.md)
- [`tooltip.tsx`](../../files/components/ui/tooltip.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
