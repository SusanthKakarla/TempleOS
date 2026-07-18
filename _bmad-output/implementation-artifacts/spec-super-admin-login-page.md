---
title: 'Super Admin Login Page'
type: 'feature'
created: '2026-07-19'
status: 'done'
route: 'one-shot'
---

# Super Admin Login Page

## Intent

**Problem:** Super Admin routes had backend session support but no browser-facing login flow, leaving protected pages unreachable without manually posting a Firebase ID token.

**Approach:** Add `/super-admin/login` as a separate phone-OTP login surface that exchanges Firebase ID tokens through `/api/super-admin/auth/session`, sets only the Super Admin session cookie, and redirects into the current Super Admin work area.

## Suggested Review Order

**Login Boundary**

- Server wrapper redirects active Super Admin sessions and sanitizes return paths.
  [`page.tsx:8`](../../app/(super-admin)/super-admin/login/page.tsx#L8)

- Client form posts only to the Super Admin auth endpoint.
  [`super-admin-login-form.tsx:153`](../../features/super-admin/super-admin-login-form.tsx#L153)

**Route Protection**

- Missing Super Admin sessions now go to the login page.
  [`require-super-admin.ts:8`](../../app/(super-admin)/super-admin/require-super-admin.ts#L8)

- Existing invalid Super Admin cookies remain forbidden instead of looping.
  [`require-super-admin.ts:13`](../../app/(super-admin)/super-admin/require-super-admin.ts#L13)

**Regression Coverage**

- Static tests preserve separation from tenant auth/session endpoints.
  [`auth-boundary.test.ts:87`](../../app/api/super-admin/auth-boundary.test.ts#L87)
