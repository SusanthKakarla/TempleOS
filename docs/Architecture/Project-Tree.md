# Project Tree

> Standalone, linkable version of the folder tree from [`ARCHITECTURE_HANDBOOK.md`](../../ARCHITECTURE_HANDBOOK.md) §2, with file counts re-verified directly against the working tree (see [Project-Overview.md](./Project-Overview.md) for the reconciled totals — this session's WhatsApp Phase 2 work added several files after the handbook was written).

Application source only (`node_modules`, `.next`, `.git` excluded). The `.agents/`, `.claude/`, `_bmad/`, `_bmad-output/` trees are AI-tooling scaffolding (BMAD agent-framework skills and generated planning artifacts) — not application code, listed once, not expanded.

```
TempleOS-main/
├── .agents/skills/bmad-*/            AI agent-framework skill definitions (tooling, not app code)
├── .claude/skills/bmad-*/            mirror of the above for Claude Code
├── .vscode/
├── _bmad/                            BMAD framework config/scripts
├── _bmad-output/                     generated planning/architecture docs
├── docs/Architecture/                THIS documentation set
├── app/                                                    115 non-test files — Next.js App Router
│   ├── (auth)/
│   │   ├── access-denied/page.tsx
│   │   └── login/page.tsx
│   ├── (dashboard)/
│   │   ├── template.tsx                                    animation wrapper
│   │   └── dashboard/
│   │       ├── page.tsx                                     dashboard home
│   │       ├── require-dashboard-admin.ts                   tenant-admin page guard
│   │       ├── admins/page.tsx                               vestigial redirect
│   │       ├── chatbot-settings/page.tsx                    central temple config hub
│   │       ├── devotees/
│   │       │   ├── page.tsx · [id]/page.tsx · import/page.tsx
│   │       │   └── family/new/page.tsx · family/[familyId]/edit/page.tsx
│   │       ├── donations/page.tsx
│   │       ├── events/page.tsx
│   │       ├── notification-preferences/page.tsx
│   │       └── users/
│   │           ├── page.tsx · activity/page.tsx · import/page.tsx
│   ├── (marketing)/
│   │   ├── privacy-policy/page.tsx
│   │   └── terms-of-service/page.tsx
│   ├── (super-admin)/super-admin/
│   │   ├── login/page.tsx
│   │   ├── require-super-admin.ts                           super-admin page guard
│   │   └── (shell)/
│   │       ├── page.tsx                                      platform dashboard
│   │       ├── admins/page.tsx · roles/page.tsx
│   │       └── temples/page.tsx · new/page.tsx · [tenantId]/page.tsx
│   ├── whatsapp-onboarding/page.tsx                          standalone embedded-signup handoff page
│   └── api/                                                  68 route.ts files — see Route-Inventory.md
│       ├── account/locale/ · admins/ (retired) · audit-log/ · auth/{session,tenant-context}/
│       ├── cron/{daily-birthday-check,process-event-notifications,process-notifications,sync-whatsapp-templates}/
│       ├── devotees/… · donations/… · events/… · media/… · notification-media/…
│       ├── notification-preferences/ · super-admin/… · temple-{faqs,sevas,social-links,special-days}/…
│       ├── tenant/ · users/… · whatsapp/{connect,disconnect,onboarding,templates,webhook}/…
│
├── components/                                              49 files — shared UI
│   ├── ui/                                                   29 shadcn/base-ui primitives (button, dialog, table, sheet, ...)
│   ├── legal/                                                LegalHero, LegalSection, TableOfContents
│   ├── table-shell.tsx · mobile-list-view.tsx · mobile-list-row.tsx
│   ├── pagination-controls.tsx · empty-state.tsx · page-header.tsx
│   ├── responsive-search-bar.tsx · sticky-toolbar.tsx
│
├── features/                                                78 files — see UI-Architecture.md
│   ├── auth/ (2) · chatbot-settings/ (17, incl. new setup wizard) · dashboard/ (10) · devotees/ (4) · donations/ (4)
│   ├── events/ (6) · export/ (1) · media/ (3) · notifications/ (3) · super-admin/ (21)
│   ├── users/ (9) · whatsapp-onboarding/ (1)
│
├── hooks/                                                   4 files (incl. use-mobile.ts)
├── i18n/                                                    next-intl config
├── lib/                                                     114 non-test files — see Database-Architecture.md, WhatsApp-Architecture.md
│   ├── auth/                                                 session, tenant-admin, super-admin-session, session-token, tenant-host, features
│   ├── cron/                                                 auth.ts, log-run.ts
│   ├── db/                                                   35 repository files
│   ├── events/ · export/ (+columns/) · firebase/ (admin, client, errors) · i18n/ · media/
│   ├── notifications/                                        engine.ts, delivery.ts
│   ├── provisioning/                                         temples.ts, tenant-members.ts
│   ├── validation/                                            zod schemas per domain
│   └── whatsapp/                                             client, delivery-strategy, conversation-resolver,
│                                                               template-{registry,validator,variable-resolver,client,sync,bootstrap},
│                                                               standard-template-catalog, delivery-logger, send-notification,
│                                                               errors, event-notifications (legacy), embedded-signup, locales/
│
├── locales/en/, locales/te/                                 next-intl JSON message catalogs
├── migrations/                                               23 .sql files — see Database-Architecture.md
├── public/                                                   static assets
├── scripts/                                                  6 non-test .mts/.mjs operational scripts
├── types/                                                    db.ts (shared domain types)
├── middleware.ts                                             ABSENT — no Next.js Edge Middleware exists in this repo
├── package.json, tsconfig.json, next.config.ts, vitest.config.ts, eslint.config.mjs, components.json
└── ARCHITECTURE_HANDBOOK.md, MVP_SPEC.md, PRODUCTION_RESET.md, README.md
```
