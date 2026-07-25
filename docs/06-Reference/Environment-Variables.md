# Environment Variable Reference

| Variable | Visibility | Used by | Purpose / governance |
|---|---|---|---|
| `ADMIN_DISPLAY_NAME` | Server secret/config | Declared but no direct use detected | Runtime configuration |
| `ADMIN_PHONE_NUMBER` | Server secret/config | Declared but no direct use detected | Runtime configuration |
| `CRON_SECRET` | Server secret/config | `ARCHITECTURE_HANDBOOK.md`, `lib/cron/auth.test.ts`, `lib/cron/auth.ts` | Secret: never log or commit |
| `DATABASE_URL` | Server secret/config | `lib/db/pool.ts`, `scripts/migrate.mts`, `scripts/seed-super-admin.mjs` | Runtime configuration |
| `FIREBASE_CLIENT_EMAIL` | Server secret/config | `lib/firebase/admin.ts` | Runtime configuration |
| `FIREBASE_PRIVATE_KEY` | Server secret/config | `lib/firebase/admin.ts` | Secret: never log or commit |
| `FIREBASE_PROJECT_ID` | Server secret/config | `lib/firebase/admin.ts` | Runtime configuration |
| `IMAGEKIT_PRIVATE_KEY` | Server secret/config | `lib/media/imagekit.ts` | Secret: never log or commit |
| `IMAGEKIT_PUBLIC_KEY` | Server secret/config | `lib/media/imagekit.ts` | Runtime configuration |
| `IMAGEKIT_URL_ENDPOINT` | Server secret/config | `lib/media/imagekit.ts` | Runtime configuration |
| `META_BUSINESS_ACCOUNT_ID` | Server secret/config | Declared but no direct use detected | Runtime configuration |
| `META_PHONE_NUMBER_ID` | Server secret/config | Declared but no direct use detected | Runtime configuration |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Browser-visible | `lib/firebase/client.ts` | Runtime configuration |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Browser-visible | `lib/firebase/client.ts` | Runtime configuration |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Browser-visible | `lib/firebase/client.ts` | Runtime configuration |
| `NEXT_PUBLIC_WHATSAPP_APP_ID` | Browser-visible | `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts`, `features/whatsapp-onboarding/whatsapp-onboarding-flow.tsx`, `lib/whatsapp/embedded-signup.ts` | Runtime configuration |
| `NEXT_PUBLIC_WHATSAPP_CONFIG_ID` | Browser-visible | `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts`, `features/whatsapp-onboarding/whatsapp-onboarding-flow.tsx` | Runtime configuration |
| `NODE_ENV` | Server secret/config | `app/layout.tsx`, `lib/auth/session.ts`, `lib/auth/super-admin-session.ts`, `lib/auth/tenant-host.ts`, `lib/firebase/errors.ts`, `lib/i18n/locale.ts` | Runtime configuration |
| `SESSION_SECRET` | Server secret/config | `lib/auth/session-live.test.ts`, `lib/auth/session-token.test.ts`, `lib/auth/session-token.ts`, `lib/auth/session.test.ts`, `lib/auth/super-admin-session.test.ts` | Secret: never log or commit |
| `SUPER_ADMIN_DISPLAY_NAME` | Server secret/config | `scripts/seed-super-admin.mjs`, `scripts/seed-super-admin.mts`, `scripts/seed.mts` | Runtime configuration |
| `SUPER_ADMIN_PHONE_NUMBER` | Server secret/config | `scripts/seed-super-admin.mjs`, `scripts/seed-super-admin.mts`, `scripts/seed.mts` | Runtime configuration |
| `TEMPLEOS_LOCAL_TENANT_HOST` | Server secret/config | Declared but no direct use detected | Runtime configuration |
| `WHATSAPP_ACCESS_TOKEN` | Server secret/config | `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts`, `lib/whatsapp/client.test.ts`, `lib/whatsapp/client.ts`, `lib/whatsapp/embedded-signup.ts`, `lib/whatsapp/template-sync.ts` | Secret: never log or commit |
| `WHATSAPP_APP_SECRET` | Server secret/config | `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts`, `lib/whatsapp/embedded-signup.ts` | Secret: never log or commit |
| `WHATSAPP_ONBOARDING_ORIGIN` | Server secret/config | `app/api/whatsapp/connect/start/route.ts` | Runtime configuration |
| `WHATSAPP_PHONE_NUMBER` | Server secret/config | Declared but no direct use detected | Runtime configuration |
| `WHATSAPP_VERIFY_TOKEN` | Server secret/config | `app/api/super-admin/temples/[tenantId]/whatsapp/route.ts`, `app/api/whatsapp/webhook/route.ts` | Secret: never log or commit |

Use `.env.example` for names only. Real values belong in the deployment secret store or ignored `.env.local`.
