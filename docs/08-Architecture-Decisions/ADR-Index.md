# Architecture Decision Records

## Accepted Decisions

1. **ADR-001 — Full-stack Next.js monolith:** shared TypeScript contracts and one deployment optimize current team velocity.
2. **ADR-002 — PostgreSQL repositories:** persistence is organized by domain in `lib/db` using parameterized SQL.
3. **ADR-003 — Separate tenant and platform sessions:** prevents identity-domain confusion and limits privilege crossover.
4. **ADR-004 — Tenant identity from trusted boundaries:** host/session/provider account determines tenant scope.
5. **ADR-005 — Forward SQL migrations:** schema history is executable, transactional, and tracked by full filename.
6. **ADR-006 — Firebase phone identity with application sessions:** Firebase proves phone ownership; TempleOS controls authorization and session lifetime.

New consequential architecture choices should be added here with context, decision, alternatives, consequences, and status.
