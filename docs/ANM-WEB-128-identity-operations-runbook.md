# ANM-WEB-128 Identity Operations Runbook

## Member cannot register
Run `npm run identity:registration-certify` and inspect registration, duplicate-email, password-policy, and email-queue evidence.

## Verification email missing
Run `npm run identity:certify`; if local queue passes but provider delivery is pending, verify staging email provider credentials, worker execution, suppression lists, and inbox delivery.

## Verification link fails
Check token status, expiration, usedAt, and route `/verify-email`. Reuse must fail; a fresh resend should create a new hashed token.

## Member cannot log in
Confirm account is Active, emailVerified=true, not Locked/Disabled/Suspended/Deleted, and password reset has not invalidated old sessions.

## Admin cannot log in
Run `npm run admin:login-smoke-test -- --email=<approved admin> --password=<redacted>` and verify `/api/auth/admin/login` rather than public member `/login`.

## Member sees admin data
Treat as P0. Verify admin APIs reject member cookies and check route ordering, cookie names, and admin RBAC middleware.

## Logout leaves member shell active
Verify `/api/auth/logout` with member scope clears `anm_member_session`, revokes the backend session, and clears client query/protected playback state.