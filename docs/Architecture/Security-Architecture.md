# Security Architecture

> Source: [`ARCHITECTURE_HANDBOOK.md`](../../ARCHITECTURE_HANDBOOK.md) §13.7, expanded to a standalone document. Methodology: every `import`/`require`/dynamic-`import()` specifier was parsed and resolved against the `@/` alias; every route's auth guard was cross-checked; every `getPool().query()` call site was checked for string concatenation.

## Finding 1 (highest priority): WhatsApp inbound webhook has no signature verification

`app/api/whatsapp/webhook/route.ts`'s `GET` handler correctly validates Meta's one-time `hub.verify_token` handshake. The `POST` handler — which processes **every** inbound message and delivery-status update — does **not** verify Meta's `X-Hub-Signature-256` HMAC header, and no `middleware.ts` intercepts the route (none exists, by design — see [Layer-Architecture.md](./Layer-Architecture.md)). Any actor who discovers the webhook URL can POST arbitrary JSON and have it processed as genuine Meta traffic: forging delivery-status updates, creating/mutating devotee records, or triggering bot replies/outbound sends.

This is the one route in the app that's a legitimate exception to session-cookie auth (Meta can't hold a cookie), but it currently has **no substitute authentication of its own**. Every other route in the app is guarded by a session/cron check — this stands out as the single gap. **Recommended fix**: compute and compare `X-Hub-Signature-256` (HMAC-SHA256 of the raw body using the Meta app secret) before processing any payload, mirroring the `timingSafeEqual` pattern already used by `isAuthorizedCronRequest` (`lib/cron/auth.ts`). See [Refactoring-Opportunities.md](./Refactoring-Opportunities.md) #1.

## Finding 2: a structural logging landmine, not yet a live issue

`lib/whatsapp/embedded-signup.ts`'s shared `graphRequest()` helper deliberately logs only *whether* an access token exists, never the token itself — and the one call receiving a real token (`exchangeCodeForConfirmation`) bypasses that helper and never logs its response body. But `graphRequest`'s generic response logger logs the **entire raw response body** for whatever endpoint calls it. None of its current callers return a token in-body, so nothing leaks today — but this is a structural risk for any future call site added to that helper without re-auditing what it returns.

## Finding 3: no SQL injection vulnerabilities found

Every `getPool().query()` call is confined to `lib/db/*.ts`. Dynamically-built `WHERE` clauses always push values through `$n` placeholders. `ORDER BY` column/direction values are always resolved through a fixed lookup table, never directly from request input. The one function that interpolates a table name directly into SQL (`lib/db/platform-stats.ts`'s internal `countAll`) is only ever called with hardcoded literal table names, never request-derived ones.

## Finding 4: `devLog()` logs phone numbers (PII, not secrets)

In the two session-creation routes, when a sign-in is rejected. Low severity (no-op in production) but worth noting for local/staging log hygiene.

## Finding 5: auth-guard coverage is otherwise complete

Cross-checking all 68 routes, the only ones lacking a session/cron guard are, without exception: the two login endpoints (verify Firebase tokens instead), the retired 410 stubs, the webhook (Finding 1), and the handoff-token-gated onboarding-complete route (by design). No anomalous gaps among the CRUD/business routes.

## Architectural note

The three-guard-function, no-middleware pattern (see [Authentication-Architecture.md](./Authentication-Architecture.md)) is working correctly today — every route was cross-checked and none is missing its expected guard. It nonetheless depends on every future PR remembering to call the right guard by hand; if the API surface keeps growing, a lint rule or a thin `middleware.ts` cross-check (without replacing the existing guards, which carry tenant-status/feature-flag logic middleware can't easily express) would convert "every route currently does this correctly" into "every route is structurally guaranteed to."

## Cross-references

[Authentication-Architecture.md](./Authentication-Architecture.md) · [WhatsApp-Architecture.md](./WhatsApp-Architecture.md) · [Refactoring-Opportunities.md](./Refactoring-Opportunities.md) (ranked fix list) · [Audit/lib/whatsapp/webhook](./Audit/) once Phase 2 Batch 3 covers the webhook route file specifically.
