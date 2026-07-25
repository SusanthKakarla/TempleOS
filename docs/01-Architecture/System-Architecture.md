# System Architecture

## Executive Summary

TempleOS is a single-deployable Next.js 16 monolith combining React presentation, App Router APIs, domain services, PostgreSQL repositories, Firebase identity, Meta WhatsApp, notifications, exports, and operational scripts. Tenant identity is resolved at the request boundary and carried into tenant-scoped persistence.

## Layer Rules

| Layer | Paths | Responsibilities | Allowed dependencies | Forbidden dependencies |
|---|---|---|---|---|
| Presentation | `app/**/page.tsx`, `features/`, `components/` | Render and collect user intent | API, shared UI, client-safe utilities | Database and server secrets from client components |
| API | `app/api/` | Auth, validation, orchestration, response mapping | Domain, repository, integrations | Trusting client tenant/role claims |
| Domain/service | `lib/notifications`, `lib/whatsapp`, `lib/export`, `lib/provisioning` | Business workflows | Repositories, validation, providers | Presentation imports |
| Repository | `lib/db/` | Parameterized persistence and mapping | PostgreSQL pool/query client | UI/framework components |
| Infrastructure | Firebase, ImageKit, Meta, cron, scripts | External systems and operations | Configuration and domain contracts | Leaking secrets to browser bundles |
| Database | `migrations/`, `types/db.ts` | Durable schema and shared record shapes | Forward migration history | Destructive history rewrites |

## High-Level Flow

`Browser/Meta/Cron → Next.js boundary → authentication + validation → domain service → repository/provider → response, audit, notification`

## Architecture Invariants

1. Tenant-facing operations derive tenant identity from a validated session or provider account, never an arbitrary body field.
2. Super-admin and tenant sessions remain separate cookie and payload domains.
3. SQL values are parameterized; cross-table business changes use explicit transactions.
4. External callbacks are authenticated, idempotent where provider retries are possible, and logged without secrets.
5. Client components cannot import server-only database or credential modules.
