# TempleOS Project Overview

## Vision and Purpose

TempleOS is a multi-tenant temple operations platform for administrators, platform operators, and devotees. It centralizes temple configuration, devotee/family records, events, donations, notifications, WhatsApp self-service, exports, media, and tenant governance.

## Users and Business Domains

- Tenant administrators manage devotees, families, events, donations, users, settings, media, and notifications.
- Platform super administrators provision and govern temples, roles, features, memberships, and status.
- Devotees interact through temple-managed WhatsApp experiences and communications.

## Technology Stack

Next.js 16.2.10, React 19.2.4, TypeScript ^5, PostgreSQL/pg ^8.22.0, Firebase, Meta WhatsApp Cloud API, ImageKit, next-intl, Tailwind CSS, Vitest, ESLint.

## Repository Classification

Single cohesive full-stack web monolith. 515 documented source/configuration/assets; 80 API route modules; 24 SQL migrations; 31 created tables detected.

## Development Philosophy

Prefer explicit tenant boundaries, small domain repositories, validated API contracts, forward-only schema evolution, provider isolation, and tests around identity and business invariants.
