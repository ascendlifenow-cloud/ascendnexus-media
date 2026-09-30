# ANM-WEB-109 Production Admin Authentication

## Architecture

The selected administrative authentication model is a secure server-side session with an HttpOnly cookie. Session tokens are opaque, stored only as hashes, and revalidated against the backend for every protected admin API.

## Login Flow

1. Admin submits email and password to `POST /api/auth/admin/login`.
2. Backend rate-limit guard checks the request.
3. Email is normalized and the user is loaded safely.
4. Pending, disabled, deleted, archived, and locked accounts are rejected.
5. Password is verified using the existing scrypt password service.
6. Effective role permissions are loaded server-side.
7. `admin.access` is required before session creation.
8. A new server-side session is created and returned as an HttpOnly cookie.
9. The response returns only a sanitized user summary, roles, permissions, expiration, and redirect target.

Legacy `/api/admin/auth/login` remains available for compatibility.

## Session Flow

`GET /api/auth/session` validates the HttpOnly session cookie, checks session status and expiration, reloads the user, rejects inactive accounts, recalculates permissions, and requires `admin.access`.

## Bootstrap and Activation

`npm run admin:bootstrap -- --email=<approved-address>` now creates a pending super administrator and a single-use activation token. No default password is created. Activation completes through `/admin/activate` and `POST /api/auth/admin/activate`.

Development/test can still use direct password bootstrap when explicitly supplied for local smoke tests.

## Password Reset

Password reset request and completion use neutral responses and hashed, single-use reset tokens. Development/test may return the reset token for local verification; production does not.

## Authorization

`admin.access` is now a first-class permission. All admin roles include it. Frontend route guards use this permission only as a UX guard; backend route permission checks remain authoritative.

## MFA

Local MFA is not implemented. ANM-WEB-102 requires production privileged access to use MFA or an approved external MFA exception before production certification.

## Health

Detailed authentication diagnostics are protected at `/api/admin/auth/health` and require `security.read` or `users.manage`. Public availability is limited to `/api/auth/admin/availability`.

## CLI

Available commands:

- `npm run admin:auth-diagnose`
- `npm run admin:bootstrap`
- `npm run admin:bootstrap-status`
- `npm run admin:roles-verify`
- `npm run admin:permissions-verify`
- `npm run admin:session-health`
- `npm run admin:auth-health`
- `npm run admin:login-smoke-test`
- `npm run admin:authz-test`
- `npm run admin:revoke-sessions -- --user=<userId>`
- `npm run admin:unlock -- --user=<userId>`

## Known Limitations

- Local `.env` examples keep `AUTH_ENABLED=false`; production and staging examples require `AUTH_ENABLED=true`.
- CSRF is not enabled in local development but is required in production/staging.
- MFA remains a production blocker unless satisfied by external identity-provider MFA.
