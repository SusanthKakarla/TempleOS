# Performance Architecture

*(New document — not present in the root handbook, built from handbook data points scattered across §6, §8, and §13.4.)*

## No queue/worker infrastructure

All background delivery is cron-polling (see [Cron-Architecture.md](./Cron-Architecture.md)) — adequate at current scale but **no distributed-lock protection** against Railway invoking overlapping instances of the same cron route concurrently. Idempotency relies entirely on each row's status transition happening inside the same request that claims it. Worth a note for whoever eventually needs true horizontal scaling of notification delivery.

## N+1 query patterns

- **`lib/db/devotee-families.ts`'s `getFamilyWithMembers`** — handbook-flagged as SELECT (N+1): fetches the family row, then resolves each member's devotee row individually rather than in one joined/batched query.

## Largest files (excluding tests) — a rough proxy for where complexity concentrates

| Rank | File | Lines |
|---|---|---|
| 1 | `lib/provisioning/temples.ts` | 874 |
| 2 | `components/ui/sidebar.tsx` (shadcn primitive, largely boilerplate) | 735 |
| 3 | `features/devotees/devotees-table.tsx` | 608 |
| 4 | `lib/db/devotees.ts` | 596 |
| 5 | `features/super-admin/new-temple-form.tsx` | 581 |
| 6 | `lib/db/notifications.ts` | 548 |
| 7 | `lib/db/tenants.ts` | 546 |
| 8 | `features/users/users-table.tsx` | 502 |
| 9 | `features/donations/donations-table.tsx` | 495 |
| 10 | `lib/provisioning/tenant-members.ts` | 481 |

`lib/provisioning/temples.ts` is ~2.6× the next-largest `lib/` file — see [Refactoring-Opportunities.md](./Refactoring-Opportunities.md) for the split recommendation.

## Caching

See [Caching-Architecture.md](./Caching-Architecture.md) — no caching layer exists anywhere; every dashboard page re-runs its full data-fetch chain per request, deliberately, since the tenant-status kill-switch depends on a live read.

## Blocking vs. fire-and-forget sends

Most mutation routes dispatch WhatsApp sends via `after()` (non-blocking, response returns immediately). `POST /api/events/[id]/announce` is the one exception — it `await`s `processNotifications()` synchronously, so its latency scales linearly with recipient count. This is intentional (the UI needs a real sent/failed count) but is the one endpoint where a large devotee list could produce a slow response.

## Cross-references

[Cron-Architecture.md](./Cron-Architecture.md) · [Caching-Architecture.md](./Caching-Architecture.md) · [Refactoring-Opportunities.md](./Refactoring-Opportunities.md) · [Database-Architecture.md](./Database-Architecture.md)
