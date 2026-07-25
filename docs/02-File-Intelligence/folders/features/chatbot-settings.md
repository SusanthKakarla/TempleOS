# Folder: features/chatbot-settings

## Purpose

The `features/chatbot-settings/` folder belongs primarily to the **Chatbot Settings** area and groups 17 direct documented files.

## Responsibilities and Business Module

- Encapsulate Chatbot Settings behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`chatbot-settings-tabs.tsx`](../../files/features/chatbot-settings/chatbot-settings-tabs.tsx.md)
- [`contact-form.tsx`](../../files/features/chatbot-settings/contact-form.tsx.md)
- [`faq-form-dialog.tsx`](../../files/features/chatbot-settings/faq-form-dialog.tsx.md)
- [`faqs-table.tsx`](../../files/features/chatbot-settings/faqs-table.tsx.md)
- [`notification-preferences-form.tsx`](../../files/features/chatbot-settings/notification-preferences-form.tsx.md)
- [`notification-settings-content.tsx`](../../files/features/chatbot-settings/notification-settings-content.tsx.md)
- [`settings-section.tsx`](../../files/features/chatbot-settings/settings-section.tsx.md)
- [`seva-form-dialog.tsx`](../../files/features/chatbot-settings/seva-form-dialog.tsx.md)
- [`sevas-table.tsx`](../../files/features/chatbot-settings/sevas-table.tsx.md)
- [`social-links-form.tsx`](../../files/features/chatbot-settings/social-links-form.tsx.md)
- [`special-day-form-dialog.tsx`](../../files/features/chatbot-settings/special-day-form-dialog.tsx.md)
- [`special-days-table.tsx`](../../files/features/chatbot-settings/special-days-table.tsx.md)
- [`temple-info-form.tsx`](../../files/features/chatbot-settings/temple-info-form.tsx.md)
- [`temple-timings-form.tsx`](../../files/features/chatbot-settings/temple-timings-form.tsx.md)
- [`whatsapp-connection-card.tsx`](../../files/features/chatbot-settings/whatsapp-connection-card.tsx.md)
- [`whatsapp-template-setup-wizard.tsx`](../../files/features/chatbot-settings/whatsapp-template-setup-wizard.tsx.md)
- [`whatsapp-templates-tab.tsx`](../../files/features/chatbot-settings/whatsapp-templates-tab.tsx.md)

## Child Folders

- None

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
