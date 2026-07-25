# TempleOS Refactoring Readiness Assessment and Execution Strategy

**Status:** Official strategy  
**Assessment date:** 2026-07-25  
**Constraint:** This document authorizes no refactoring.

## Executive Verdict

> 🟡 **Refactor After Completing Missing Prerequisites**

TempleOS has a credible foundation: strict TypeScript and ESLint pass, the production build succeeds, and 564 tests pass across 72 files. The architecture is understandable, tenant and platform identity domains are separated, database access is organized by domain, and the EKB provides source-level traceability.

Refactoring should not begin today. There is no repository CI pipeline, browser-level critical-journey suite, measured coverage baseline, verified backup/restore and rollback procedure, or production observability baseline. Most API routes lack colocated route tests. Security remediation is also required at the WhatsApp webhook and database TLS boundaries. The safe course is a short stabilization phase followed by bounded, behavior-preserving refactors beginning with the export subsystem and pure utilities.

## 1. Project Stability Assessment

Scores use a 1–10 scale; 10 means demonstrably governed and production-proven.

| Dimension | Score | Evidence and explanation |
|---|---:|---|
| Architecture Stability | **8/10** | Clear presentation, API, domain, repository, and infrastructure boundaries. Import rules are not enforced, and several orchestration/repository files exceed 400–700 lines. |
| Code Quality | **8/10** | Strict TypeScript, ESLint, parameterized SQL, focused validation, and domain modules are strong. Large files create localized complexity. |
| Maintainability | **7/10** | Structure and naming are coherent and the EKB removes discovery friction. Oversized provisioning, repository, and feature modules plus duplicated migration ordinals reduce clarity. |
| Scalability | **6/10** | Suitable for current SaaS scale, but cron/provider work lacks durable queues, query budgets, tenant-aware telemetry, and capacity evidence. |
| Security | **6/10** | Strong session separation, membership revalidation, and constant-time cron authentication. WhatsApp POST signatures are not verified, external PostgreSQL TLS disables certificate verification, and explicit rate limiting is absent. |
| Performance | **7/10** | Pagination and targeted repositories exist. Slow-query/provider telemetry, load profiles, and bundle budgets are absent. |
| Testing Readiness | **7/10** | 564 tests cover identity, validation, repositories, notifications, exports, and WhatsApp rules. Only 14 test files are under `app/api`, feature UI has three test files, no browser E2E exists, and coverage is unmeasured. |
| Documentation Completeness | **9/10** | Architecture, API, database, environment, dependency, folder, and per-file intelligence exist. The EKB must be reviewed, committed, and CI-validated. |
| Developer Experience | **6/10** | Local commands are good. CI, CODEOWNERS, automated migration gates, production-like test data, and one-command bootstrap are missing. |
| Production Readiness | **7/10** | Build and tests pass. Webhook authenticity, TLS policy, restore rehearsal, rollback runbooks, health/metrics, and release automation remain gaps. |
| **Overall Refactoring Readiness** | **6/10** | The code is refactorable, but its release safety net is insufficient for broad structural change. |

## 2. Should We Refactor Now?

### 🟡 Refactor After Completing Missing Prerequisites

This is the only approved recommendation.

Evidence:

- Typecheck, lint, all 564 tests, and the production build pass.
- Domain groupings and high-value invariant tests provide a stable technical base.
- The EKB documents 515 files, 156 folders, 80 API route modules, 24 migrations, and 31 tables, including the newly integrated Campaign domain.
- No CI workflow enforces local success as a merge condition.
- No E2E suite proves login, tenant isolation, provisioning, imports, notification delivery, or WhatsApp onboarding.
- Production backup, restore, rollback, monitoring, alerting, and performance baselines are not evidenced.
- WhatsApp webhook POST signature validation is absent; database TLS uses `rejectUnauthorized: false`.
- The EKB/generator are currently uncommitted, so there is no tagged pre-refactor baseline.

## 3. Missing Prerequisites

All Gate A items are mandatory before any refactor. Gate B is mandatory before high-risk work.

### Gate A — Before Any Refactoring

| Prerequisite | Required result | Why it matters |
|---|---|---|
| Stable baseline | Review/commit EKB and app state; clean tree; tag production-equivalent revision | Makes every diff attributable and recoverable. |
| CI quality gate | Install, typecheck, lint, tests, build, migration-order, and Markdown-link checks | Prevents local-only success. |
| Coverage baseline | Publish line/branch/function coverage by module | Finds behavior that green tests do not protect. |
| Critical smoke E2E | Tenant login, super-admin login, isolation denial, core CRUD, logout | Protects framework/cookie/routing/database seams. |
| Backup and restore | Restore a representative backup into isolation and record checks/duration | A backup is not proven until restored. |
| Release rollback | Application rollback, database forward-fix, config/provider rollback, decision owner | Refactors can fail after passing tests. |
| Feature freeze rule | No feature behavior changes in a refactor PR; freeze selected module | Keeps diagnosis and rollback tractable. |
| Observability minimum | Structured errors, correlation IDs, health signal, alert ownership | Detects regressions before users report them. |

### Gate B — Before High-Risk Refactoring

| Prerequisite | Required result | Protected area |
|---|---|---|
| WhatsApp authenticity | Raw-body `X-Hub-Signature-256` verification and valid/invalid/replay fixtures | Webhook/message processing |
| Database TLS | Verified production certificates or provider-approved documented alternative | Persistence |
| Boundary controls | Rate/request-size limits for auth, upload, import, webhook, costly mutations | Public APIs |
| Route characterization | Success, auth, validation, isolation, and repository-failure tests | API routes |
| Migration rehearsal | Apply from zero and a sanitized production-like snapshot | Schema/repositories |
| Provider fixtures | Versioned Firebase, Meta, and ImageKit success/error fixtures | Integrations |
| Load baseline | List, export, cron, notification, and provider latency/throughput | Performance work |

## 4. Refactoring Safety Matrix

| Module | Classification | Conditions and rationale |
|---|---|---|
| EKB/documentation tooling | **SAFE NOW** | Recoverable documentation changes; validate links and regeneration. |
| Pure date/currency/phone/pagination/URL helpers | **SAFE NOW** | Small, mostly testable; preserve exports and run focused tests. |
| Export subsystem (`lib/export`) | **SAFE NOW after Gate A** | Bounded, well tested, limited authorization responsibility; recommended first. |
| Leaf presentation components | **SAFE NOW after Gate A** | Only components without auth/data effects; require visual checks. |
| Shared UI primitives | **SAFE AFTER TESTS** | Low business logic but wide visual blast radius. |
| Dashboard and feature tables | **SAFE AFTER TESTS** | Filtering, selection, pagination, accessibility, and mobile behavior need characterization. |
| Validation modules | **SAFE AFTER TESTS** | Preserve success/failure and compatibility contracts. |
| Devotee/event/donation repositories | **SAFE AFTER TESTS** | Tenant scope and aggregates make changes medium/high risk. |
| API routes | **SAFE AFTER TESTS** | Require route auth, validation, error, and isolation tests. |
| Configuration/environment loading | **SAFE AFTER DOCUMENTATION** | EKB exists; deployment-owner confirmation and compatibility plan remain. |
| Super-admin non-provisioning operations | **SAFE AFTER FEATURE FREEZE** | Cross-tenant authority raises business impact. |
| Provisioning | **SAFE AFTER FEATURE FREEZE** | Transactional multi-entity creation and rollback. |
| Notification engine | **SAFE AFTER FEATURE FREEZE** | Delivery state, retries, templates, preferences, and providers cross boundaries. |
| WhatsApp templates/onboarding | **SAFE AFTER FEATURE FREEZE** | Provider state and embedded signup are hard to reproduce and roll back. |
| Authentication/session/tenant isolation | **DO NOT TOUCH** | Central security boundary; defer until E2E, monitoring, rollback, and security review. |
| WhatsApp webhook processing | **DO NOT TOUCH** | First remediate signatures/idempotency separately, then characterize callbacks. |
| Cron delivery workers | **DO NOT TOUCH** | Cross-tenant side effects need observability, bounded batches, and replay tests. |
| Applied migrations | **DO NOT TOUCH** | Filenames are durable production identities; never rewrite history casually. |
| Tenant/person/membership schema | **DO NOT TOUCH** | Identity and isolation depend on exact semantics. |

`SAFE NOW` never bypasses Gate A.

## 5. Risk Assessment

| Recommendation | Risk | Business/technical/deployment risk | Rollback difficulty |
|---|---|---|---|
| Commit/tag baseline | Safe | Wrong baseline selection | Easy |
| CI and documentation gates | Low | Temporary merge friction/environment differences | Easy |
| Coverage and smoke E2E | Low | Flakiness if test data isolation is poor | Easy |
| Observability without behavior changes | Low | Cost/noise or sensitive-data logging | Easy/medium |
| Webhook signature verification | Medium | Misconfiguration may reject legitimate messages; raw-body/proxy behavior | Medium |
| Database certificate validation | Medium | Connection outage if CA/config is wrong | Medium |
| Export refactor | Low | CSV/workbook/PDF compatibility | Easy with golden fixtures |
| Split large UI modules | Medium | Workflow/mobile/accessibility regressions | Easy if contracts stay stable |
| Split repositories/services | High | Tenant leakage, aggregate or transaction drift | Hard |
| Provisioning refactor | High | Failed/partial tenants | Hard |
| Notifications/cron/WhatsApp refactor | Critical | Duplicate, missing, or unauthorized messages | Very hard after side effects |
| Migration-history rewrite | Critical | Schema divergence and duplicate DDL | Potentially irreversible |
| Authentication/isolation refactor | Critical | Cross-tenant access or lockout | Very hard/security-sensitive |

## 6. Refactoring Opportunities

### Quick Wins

- Add CI, coverage, documentation links, CODEOWNERS, and migration validation.
- Standardize naming/imports only when tests/compiler prove no contract change.
- Consolidate repeated route response/error helpers after characterization tests.
- Split presentational sections from oversized feature components without moving auth/data logic.
- Self-host fonts for reproducible builds.

### Medium Improvements

- Refactor `lib/export` behind stable format contracts and golden-output tests.
- Decompose feature tables into controller/state, desktop, mobile, filter, and action components.
- Extract shared pagination/filter/query patterns only after confirming identical behavior.
- Add fail-fast environment schema validation.
- Enforce layer/import boundaries through ESLint.
- Standardize API errors and request parsing one domain at a time.

### Large Refactors

- Split provisioning into transaction orchestration and narrow collaborators.
- Split large devotees/tenants/notifications repositories behind stable facades.
- Separate notification policy, scheduling, persistence, delivery, provider, and reconciliation.
- Move cron/provider work to bounded queue-backed jobs only when scale evidence justifies it.

### Cleanup Requiring Evidence

- Delete retired `/api/admins` only after access logs and client searches prove no consumers.
- Normalize migration ordinals only with historical aliases and zero/snapshot migration tests; deletion is forbidden.
- A file with no static importer is a review candidate, not proven dead code.
- Extract shared UI only where behavior, accessibility, and styling contracts match.

## 7. Refactoring Priority Matrix

P0/P1 are prerequisites or remediation, not structural refactors.

| Priority | Title | Affected files/areas | Dependencies | Risk | Effort | Expected benefit / business impact |
|---|---|---|---|---|---|---|
| P0 | Recoverable baseline | Repository, deployment, PostgreSQL | Deployment owner, backup access | Low | M | Safe comparison/recovery; prevents unrecoverable incidents |
| P0 | Authenticate WhatsApp callbacks | `app/api/whatsapp/webhook/route.ts` | App secret, proxy, fixtures | Medium | S/M | Blocks forged side effects; protects devotee/message data |
| P1 | CI quality gates | CI and package scripts | Stable test environment | Low | M | Reproducible merge safety |
| P1 | E2E and coverage baseline | App/test harness | Isolated DB/Firebase strategy | Medium | L | Protects cross-layer behavior |
| P1 | Observability and rollback | APIs, cron, providers, operations | Monitoring platform | Medium | M/L | Faster detection/recovery |
| P1 | TLS and boundary hardening | `lib/db/pool.ts`, public routes | Provider CA, limiter | Medium | M | Closes security gaps |
| P2 | Export refactor | `lib/export/**` | Gate A, golden fixtures | Low | M | First safe process proof; faster maintenance |
| P2 | Feature-component decomposition | Large `features/**` files | Component/E2E tests | Medium | L | Focused ownership and safer UI changes |
| P2 | API boundary standardization | `app/api/**` | Route tests | Medium | L | Consistent contracts |
| P2 | Repository decomposition | devotees/tenants/notifications repositories | DB snapshots/tests | High | L | Lower coupling |
| P3 | Architecture enforcement | ESLint/folder policy | Stable graph | Low/medium | M | Prevents erosion |
| P3 | Retired endpoint cleanup | `app/api/admins/**` | Access logs/deprecation | Medium | S | Less surface without breaking clients |
| P3 | Safe migration normalization | migrations/runner | Zero/snapshot tests and aliases | High | M | Clear history |
| P4 | Queue-backed delivery | Notifications, cron, WhatsApp | Scale evidence/infra | High | XL | Resilience and scale |
| P4 | Deployment/module separation | Whole architecture | Metrics/team topology | Critical | XL | Future option; premature now |

## 8. Recommended Execution Order

### Phase 0 — Stabilize (Sprint 1)

1. Review/commit EKB; clean tree; tag baseline.
2. Add CI for install, typecheck, lint, tests, build, migrations, and links.
3. Publish coverage; prove restore and rollback.
4. Add structured monitoring and alert ownership.
5. Deploy webhook signature and DB TLS remediations separately.

**Exit:** Gate A passes in CI and security remediations are monitored.

### Phase 1 — Characterize (Sprint 2)

1. Add E2E for both identity domains and tenant isolation.
2. Add route tests for the first two refactor domains.
3. Add golden exports and provider fixtures.
4. Establish list/export/cron/provider performance baselines.
5. Freeze the first selected module.

### Phase 2 — Prove the Process (Sprint 3)

1. Refactor only `lib/export`, preserving public contracts.
2. Optionally refactor a pure utility cluster.
3. Deploy, smoke test, observe, and retrospect.
4. Update EKB, handbook, File Intelligence, and strategy.

### Phase 3 — Presentation (Sprints 4–5)

Characterize and split one feature at a time: devotees → users → donations → events. Do not combine API/repository changes.

### Phase 4 — API and Repositories (Sprints 6–8)

Standardize one domain API, then split its repository behind an unchanged facade. Verify tenant predicates and snapshots. Suggested order: events → donations → devotees → tenants/memberships → notifications.

### Phase 5 — High Risk (After Multiple Stable Releases)

Provisioning → notification separation → queue-backed cron/provider work if justified → WhatsApp internals → identity only under a threat model, security review, E2E matrix, and rollback drill.

Applied migration history is excluded from every phase.

## 9. What Must Not Be Refactored Yet

- `lib/auth/session.ts`, `session-token.ts`, `super-admin-session.ts`, and tenant-host resolution.
- `app/api/auth/**` and `app/api/super-admin/auth/**`.
- `app/api/whatsapp/webhook/route.ts` until security remediation and provider fixtures are complete.
- `lib/whatsapp/embedded-signup.ts` and onboarding callbacks.
- Notification persistence/delivery strategy and `app/api/cron/**`.
- `lib/provisioning/**`.
- Existing `migrations/*.sql` and core tenant/person/membership schema.
- Widely shared utilities without direct characterization tests.

Security fixes are allowed only as isolated remediation, never mixed with structural cleanup.

## 10. Mandatory Refactoring Rules

1. Gate A must be complete and green in CI.
2. Never mix features, security fixes, upgrades, schema changes, and refactoring in one PR.
3. One domain and behavioral boundary per PR.
4. Preserve API, data, event, cookie, environment, and provider contracts unless separately approved.
5. Add characterization tests before moving unprotected behavior.
6. Never weaken tenant derivation or predicates without security review.
7. Never edit/delete/reorder/rename applied migrations without deployed-history compatibility.
8. Database query changes compare rows, scope, order, pagination, transactions, and errors.
9. Side-effect changes require idempotency, retry, timeout, classification, and replay tests.
10. Keep stable facades during decomposition; remove them only after consumer/telemetry verification.
11. Freeze the selected domain through post-deploy observation.
12. Every PR states risk, contracts, tests, performance, deploy, rollback, and monitoring.
13. All quality, E2E, build, migration, and documentation checks pass before merge.
14. Update EKB, handbook, File Intelligence, ADRs, and changelog with structural changes.
15. Run `npm run docs:ekb` and review generated changes after restructuring.
16. Static non-use alone never proves dead code.
17. Deploy incrementally and stop when production signals degrade.

## 11. Success Metrics

Record baselines in Phases 0–1; targets are gates, not claims about current production behavior.

| Area | Baseline required | Target |
|---|---|---|
| Duplication | Duplication percentage by domain | Reduce confirmed duplication **20–30%** without false abstractions |
| Maintainability | Large files, graph fan-in/out, change failure | No new >400-line behavioral files; selected-module complexity down **20%** |
| Productivity | Median task-to-reviewed-PR time | **20%** faster selected-domain changes; one-day onboarding |
| Performance | p50/p95/p99 routes, queries, cron, exports, providers | No refactor regression over **5%** |
| Security | Open boundary findings/age | Authenticated webhooks, verified DB TLS, boundary rate limits |
| Architecture | Layer/import violations | Zero new violations; CI blocks forbidden imports |
| Testing | Coverage and critical-journey matrix | 100% of changed behavior characterized; smoke E2E always green |
| Build | CI duration/variance | Under **10 minutes** or improve baseline **20%** |
| Deployment confidence | Failure/rollback rates, MTTD/MTTR | No failure-rate increase; reduced detection/recovery time |
| Technical debt | Findings by age/priority | Close P0/P1 prerequisites before high-risk refactors |

## Final Recommendation

1. **Ready today?** No. The code is stable enough to become ready quickly; operational safety controls are not.
2. **Must complete first?** Clean/tagged baseline, CI, coverage, E2E, restore proof, rollback, freeze policy, observability, webhook signatures, and DB TLS.
3. **First module?** `lib/export`: bounded, strongly tested, low authorization risk, easy rollback.
4. **Last module?** Authentication/session/tenant isolation. Applied migration history is excluded, not last.
5. **Biggest ROI?** CI plus characterization/E2E enables every refactor; the best first structural ROI is export, followed by large feature components and repositories behind facades.
6. **Highest risk?** Identity/isolation, migration history, core identity schema, provisioning, webhook/onboarding, notification delivery, and cron.
7. **Roadmap:** Sprint 1 controls/security; Sprint 2 characterization; Sprint 3 export pilot; Sprints 4–5 UI decomposition; Sprints 6–8 APIs/repositories; high-risk domains only after stable releases.

Stop and return to stabilization whenever CI, E2E, production metrics, isolation checks, or rollback readiness deteriorate.

## Evidence Sources

- [Engineering Knowledge Base](../Engineering-Knowledge-Base.md)
- [Engineering Audit](../03-Audits/Engineering-Audit.md)
- [Engineering Roadmaps](Engineering-Roadmaps.md)
- [System Architecture](../01-Architecture/System-Architecture.md)
- [API Catalog](../06-Reference/API-Catalog.md)
- [Database Catalog](../06-Reference/Database-Catalog.md)
- [Testing Architecture](../Architecture/Testing-Architecture.md)
- Verified: TypeScript pass, ESLint pass, 72/72 test files and 564/564 tests pass, production build pass.
