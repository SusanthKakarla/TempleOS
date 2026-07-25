# Testing Architecture

> Source: [`ARCHITECTURE_HANDBOOK.md`](../../ARCHITECTURE_HANDBOOK.md) §13.8, expanded. 71 test files, colocated with source (not a separate `__tests__` tree), run via `vitest run` (`vitest.config.ts` — `node` environment, `@/` alias resolved to repo root).

## Coverage by directory

| Directory | Test files | Non-test files | Notable gaps |
|---|---|---|---|
| `app/` | 14 | 115 | No route-handler tests exist for any of the 68 API routes or 4 cron routes — only underlying `lib`/`db` functions are tested. Consistent precedent, not an oversight per-route. |
| `features/` | 3 | 78 | Only `member-role-editor-helpers.test.ts`, `new-temple-form-helpers.test.ts`, `temple-detail-edit-form-helpers.test.ts` — pure-logic helper files, not components themselves (no component-render tests anywhere in the repo). |
| `components/` | 0 | 49 | No tests on any shared primitive. |
| `lib/` | 51 | 114 | The bulk of real coverage lives here — see gaps below. |
| `hooks/` | 0 | 4 | Untested. |
| `migrations/` | 1 | 23 | One test asserting migration-runner behavior, not per-migration SQL correctness. |
| `scripts/` | 2 | 6 | `seed-bootstrap.test.ts`, `provision-temple.test.ts`. |

## `lib/db/*.ts` gaps (22 of 35 files have no `.test.ts`)

Including the largest ones: `devotees.ts` (596 lines — core CRUD/search/occasion queries), `devotee-families.ts`, `events.ts`, `platform-stats.ts` (powers the entire Super Admin dashboard), `whatsapp-conversations.ts`, `whatsapp-messages.ts`. **`unique-violation.ts` itself has zero tests** — notable since 9 other files distrust it enough to reimplement it locally rather than import it (see [Refactoring-Opportunities.md](./Refactoring-Opportunities.md)).

`whatsapp-message-templates.ts` and `whatsapp-accounts.ts` **gained real coverage this session** (`whatsapp-message-templates.test.ts` — 5 tests covering `insertTemplateIfMissing`'s ON CONFLICT DO NOTHING semantics and `setApprovalStatus`'s 3 transition-guard cases; `whatsapp-accounts.test.ts` extended with `listConnectedWhatsAppAccounts`) — closing part of what the handbook originally flagged as a gap.

## Beyond `lib/db`

- `lib/provisioning/tenant-members.ts` (481 lines, the largest untested business-logic file) has **no tests**, even though its sibling `lib/provisioning/temples.ts` does — a notable asymmetry.
- Most of the WhatsApp template-management sub-layer was untested at handbook-writing time (`template-validator.ts`, `template-sync.ts`, `template-client.ts`, `delivery-strategy.ts`, `conversation-resolver.ts`, `delivery-logger.ts`, `template-variable-resolver.ts`, `template-registry.ts`), as is `lib/whatsapp/onboarding-handoff.ts` — the sole auth mechanism for the onboarding-complete route, despite being security-load-bearing.
- **New this session**: `lib/whatsapp/template-bootstrap.test.ts` (catalog shape, idempotency, `buildSubmissionGuide` placeholder conversion) adds coverage for the newly-shipped bootstrap layer specifically.
- By contrast, `lib/validation/*`, `lib/export/*`, `lib/auth/session*.ts`, and most of the WhatsApp message-building/classification layer are well covered.

## No `TODO`/`FIXME`/`HACK`/`XXX` markers anywhere in non-test source (verified in the handbook, still true).

## Cross-references

[Refactoring-Opportunities.md](./Refactoring-Opportunities.md) for the ranked priority list (writing `unique-violation.ts` tests is recommendation #2) · [Security-Architecture.md](./Security-Architecture.md) for why `onboarding-handoff.ts`'s missing coverage matters.
