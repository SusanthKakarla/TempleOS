# Folder: lib/whatsapp

## Purpose

The `lib/whatsapp/` folder belongs primarily to the **WhatsApp** area and groups 29 direct documented files.

## Responsibilities and Business Module

- Encapsulate Whatsapp behavior or assets.
- Keep dependencies directed toward shared `lib/`, `components/`, or domain-specific modules rather than creating cycles.
- Owner: Unassigned; introduce CODEOWNERS for explicit accountability.

## Contained Files

- [`client.test.ts`](../../files/lib/whatsapp/client.test.ts.md)
- [`client.ts`](../../files/lib/whatsapp/client.ts.md)
- [`conversation-resolver.ts`](../../files/lib/whatsapp/conversation-resolver.ts.md)
- [`delivery-logger.ts`](../../files/lib/whatsapp/delivery-logger.ts.md)
- [`delivery-strategy.ts`](../../files/lib/whatsapp/delivery-strategy.ts.md)
- [`embedded-signup.ts`](../../files/lib/whatsapp/embedded-signup.ts.md)
- [`errors.test.ts`](../../files/lib/whatsapp/errors.test.ts.md)
- [`errors.ts`](../../files/lib/whatsapp/errors.ts.md)
- [`event-notifications.ts`](../../files/lib/whatsapp/event-notifications.ts.md)
- [`get-tenant-day-start-utc.test.ts`](../../files/lib/whatsapp/get-tenant-day-start-utc.test.ts.md)
- [`graph-api.ts`](../../files/lib/whatsapp/graph-api.ts.md)
- [`i18n.test.ts`](../../files/lib/whatsapp/i18n.test.ts.md)
- [`i18n.ts`](../../files/lib/whatsapp/i18n.ts.md)
- [`message-type.test.ts`](../../files/lib/whatsapp/message-type.test.ts.md)
- [`message-type.ts`](../../files/lib/whatsapp/message-type.ts.md)
- [`onboarding-handoff.ts`](../../files/lib/whatsapp/onboarding-handoff.ts.md)
- [`router.test.ts`](../../files/lib/whatsapp/router.test.ts.md)
- [`router.ts`](../../files/lib/whatsapp/router.ts.md)
- [`send-notification.ts`](../../files/lib/whatsapp/send-notification.ts.md)
- [`standard-template-catalog.ts`](../../files/lib/whatsapp/standard-template-catalog.ts.md)
- [`template-bootstrap.test.ts`](../../files/lib/whatsapp/template-bootstrap.test.ts.md)
- [`template-bootstrap.ts`](../../files/lib/whatsapp/template-bootstrap.ts.md)
- [`template-client.ts`](../../files/lib/whatsapp/template-client.ts.md)
- [`template-registry.ts`](../../files/lib/whatsapp/template-registry.ts.md)
- [`template-sync.ts`](../../files/lib/whatsapp/template-sync.ts.md)
- [`template-validator.ts`](../../files/lib/whatsapp/template-validator.ts.md)
- [`template-variable-resolver.ts`](../../files/lib/whatsapp/template-variable-resolver.ts.md)
- [`templates.test.ts`](../../files/lib/whatsapp/templates.test.ts.md)
- [`templates.ts`](../../files/lib/whatsapp/templates.ts.md)

## Child Folders

- `lib/whatsapp/locales/`

## Relationships and Import Rules

- Allowed: lower-level domain services, validation, repositories, and shared UI/utilities appropriate to this layer.
- Forbidden: tenant data access without tenant scoping; client components importing server-only/database modules; repository modules importing presentation code.

## Future Improvements

- Assign ownership and keep this inventory regenerated after structural changes.
- Split the folder when unrelated business responsibilities begin sharing only location.
