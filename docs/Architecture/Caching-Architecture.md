# Caching Architecture

*(New document — not present in the root handbook. Direct finding: this is documenting an absence, not skipping a section.)*

## Finding: no dedicated caching layer exists

A repo-wide check found:

- **No Redis, Memcached, or any external cache store** in `package.json` dependencies or anywhere in `lib/`.
- **No `unstable_cache` usage** and no `revalidate`/`revalidatePath`/`revalidateTag` calls anywhere in `app/` or `lib/` beyond what Next.js does implicitly for Server Components.
- **React's built-in `cache()`** (request-scoped memoization, not cross-request caching) is used in exactly two places, both noted in the handbook: `lib/db/persons.ts`'s `getPersonById` and `lib/db/tenant-memberships.ts`'s `getTenantMembershipById` — these dedupe repeated lookups *within a single request/render pass*, not across requests.
- **No HTTP caching headers** are set on any API route (`Cache-Control`, `ETag`, etc.) — every `route.ts` response is implicitly non-cached.
- **Static assets** (`public/`) get Next.js's default static-file caching; nothing custom.

## What this means in practice

Every dashboard page load re-runs its full data-fetch chain (session verify → membership/tenant re-fetch → domain query) on every request — by design, since the tenant-status kill-switch (see [Authentication-Architecture.md](./Authentication-Architecture.md)) depends on that row being read live, not from a cache. Caching the tenant/membership lookup would directly undermine the "suspend a tenant, all staff locked out on next request" guarantee, so its absence here is deliberate, not an oversight.

Elsewhere (feature catalogs, notification templates, static content queries like FAQs/sevas) there is currently no caching either, though these don't carry the same live-security-check constraint — a candidate for a future `unstable_cache` layer if read load ever becomes a bottleneck. See [Performance-Architecture.md](./Performance-Architecture.md) for where this would matter most (the N+1 query call-outs).

## Cross-references

[Performance-Architecture.md](./Performance-Architecture.md) · [Authentication-Architecture.md](./Authentication-Architecture.md) for why the auth-critical lookups are deliberately never cached.
