# ANM-WEB-109 Admin Access Diagnostic

## Observed Failure

The admin portal had a partial access path: `/admin/login` existed, but the production contract endpoints required by ANM-WEB-109 were missing. The backend exposed `/api/admin/auth/login`, `/api/admin/auth/session`, and `/api/admin/auth/logout`, while the required canonical routes are `/api/auth/admin/login`, `/api/auth/session`, and `/api/auth/logout`.

## Environment

Local workspace verification on July 11, 2026.

## Diagnostic Results

- Login page availability: `/admin/login` exists.
- API endpoint availability: legacy auth endpoints existed; canonical auth endpoints have been added.
- Database user state: active administrator records exist in the local JSON persistence store.
- Bootstrap state: complete locally, with active super administrator records.
- Cookie behavior: HttpOnly session cookie support exists. Production/staging config requires secure cookies.
- Session behavior: server-side sessions are persisted and hashed; auth smoke verified login, cookie session, and logout.
- CORS result: production/staging config requires explicit origins; credentialed wildcard CORS is not allowed by prior security work.
- CSRF result: disabled in local development; production/staging config requires CSRF.
- Trusted proxy result: production readiness remains configuration-dependent.
- Role result: system roles now include `admin.access`.
- Permission result: required admin permissions resolve with no missing permissions.
- Route-guard result: admin shell requires authenticated session and `admin.access`.
- Redirect result: login return paths are constrained to internal `/admin/*` paths.
- MFA result: not implemented locally; ANM-WEB-102 keeps production privileged access blocked without MFA or an approved external MFA exception.

## Root Cause

The immediate access-path defect was route contract drift: frontend/backend auth used the older `/api/admin/auth/*` namespace while ANM-WEB-109 and production access diagnostics require `/api/auth/admin/*` plus `/api/auth/session`.

## Secondary Causes

- `admin.access` was not a first-class permission.
- Bootstrap accepted password input directly, which is unsuitable as the production recovery path.
- Detailed auth health was exposed without requiring an authenticated security/user-management permission.
- Local auth defaults intentionally set `AUTH_ENABLED=false`, causing diagnostics to report unavailable unless auth is enabled for verification.
- MFA remains a production exception/blocker from ANM-WEB-102.

## Security Implications

No authentication bypass was introduced. The repair strengthens route eligibility by enforcing `admin.access` on login and session hydration, moves bootstrap toward single-use activation tokens, and protects detailed authentication health.

## Verification Plan

Run:

```bash
npm run test:auth
AUTH_ENABLED=true npm run admin:auth-diagnose
AUTH_ENABLED=true npm run admin:auth-health
npm run admin:permissions-verify
npm run admin:bootstrap-status
npm run typecheck
npm run build
```
