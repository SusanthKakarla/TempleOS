# Firebase Console Prerequisites for Phone-OTP Login

This is a one-time-per-environment checklist, not application code. Nothing here is enforced by TempleOS itself — a misconfigured item below reproduces as a client-side Firebase error during `signInWithPhoneNumber` or `RecaptchaVerifier` init, mapped to a user-facing message by `lib/firebase/errors.ts`. If new admins on an **existing, already-working** temple can't sign in, the problem is almost always application-side (see [Authentication-Architecture.md](./Authentication-Architecture.md) and the phone-normalization notes below) — these Console settings only need re-checking when something changes at the *environment* level: a new tenant subdomain goes live, a new deployment target (staging, a new region) is stood up, or Firebase Auth quotas/billing change.

## 1. Phone sign-in provider

Firebase Console → Authentication → Sign-in method → **Phone** must be enabled. If disabled, every `signInWithPhoneNumber` call fails with `auth/operation-not-allowed` (mapped to "SMS delivery is not allowed for this region. Contact support.").

## 2. Authorized domains

Firebase Console → Authentication → Settings → **Authorized domains** must include every hostname `signInWithPhoneNumber`/`RecaptchaVerifier` will run from:

- The base app domain (e.g. `templeos.app`).
- **Every tenant's custom subdomain and any custom domain** (`lib/auth/tenant-host.ts`'s `resolveTenantHost()` reads the request's `Host` header, and the login form runs on whatever hostname the browser loaded — Firebase validates the request origin against this list independently of anything TempleOS's own code checks).
- `localhost` for local development (added by default, but confirm it hasn't been removed).

A hostname missing from this list is the single most likely explanation for "OTP works for our original temple but not for a temple we just provisioned" — the failure surfaces as `auth/invalid-app-credential` or a reCAPTCHA render failure, not an obviously-domain-related error message.

## 3. reCAPTCHA / App Check

- The invisible `RecaptchaVerifier` (`features/auth/tenant-login-form.tsx`) needs Firebase's default reCAPTCHA key to be valid for the project — this is provisioned automatically when Phone sign-in is enabled (§1) and does not need separate Console setup in the common case.
- If **App Check** is enforced on the project (Console → App Check), the web app must have an App Check provider (reCAPTCHA v3/Enterprise) registered and the client SDK configured to attach a token, or every auth call is rejected before it reaches phone verification at all. TempleOS's client init (`lib/firebase/client.ts`) does not currently initialize App Check — if App Check enforcement is ever turned on for this project, phone login breaks entirely until that's added to the client bundle.

## 4. SMS region policy & quota

- Console → Authentication → Settings → **SMS region policy**: if set to an allowlist, it must include every country code temple admins actually sign in from. A number outside the allowed region fails with `auth/invalid-phone-number` even though the number itself is valid E.164 — indistinguishable, from the mapped error message alone, from a genuine formatting mistake.
- Free-tier and per-project SMS quotas exist; exceeding them produces `auth/quota-exceeded` (mapped) or `auth/too-many-requests` (mapped, with the client's own 60-second retry cooldown in `tenant-login-form.tsx`). Billing must be enabled (`auth/billing-not-enabled`, mapped) for volume beyond the free tier.

## 5. Environment variables (not Console, but adjacent)

Both must point at the **same** Firebase project, or ID-token verification will fail server-side even though the client successfully got an OTP and confirmed it:

- Client: `NEXT_PUBLIC_FIREBASE_*` (consumed by `lib/firebase/client.ts`).
- Server: `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` (consumed by `lib/firebase/admin.ts`'s `verifyFirebaseIdToken`).

A project-ID mismatch between the two produces a token-verification failure at `POST /api/auth/session`, which the client currently reports as the generic "Invalid or expired login code."

## What this checklist does *not* explain

If OTP delivery and Firebase verification both succeed but the admin still can't reach the dashboard, that's an **authorization** rejection inside TempleOS's own Postgres-backed provisioning (`app/api/auth/session/route.ts`'s `NOT_AUTHORIZED` path — see [Authentication-Architecture.md](./Authentication-Architecture.md)), not a Firebase/Console problem. The two most common causes there:

- The phone number saved at invite time doesn't E.164-match what Firebase returns at login — `features/users/invite-user-dialog.tsx` now shows a live normalized-number preview specifically to catch this before saving.
- A stale `persons.firebase_uid` binding from a previous account (project change, phone number reassigned) — remediate with `npm run auth:clear-firebase` (wraps `scripts/clear-person-firebase-uid.mts`), which clears one person's binding by phone so the next successful OTP login rebinds cleanly.
