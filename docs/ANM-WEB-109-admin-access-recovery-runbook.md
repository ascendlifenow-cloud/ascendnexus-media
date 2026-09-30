# ANM-WEB-109 Admin Access Recovery Runbook

## Login Page Missing

Verify the client build includes `/admin/login` and route fallback is not serving a stale bundle. Run `npm run build`.

## Login API Unavailable

Check both canonical and compatibility endpoints:

- `/api/auth/admin/login`
- `/api/admin/auth/login`

Run `npm run admin:auth-diagnose`.

## No Administrator Exists

Run:

```bash
npm run admin:bootstrap-status
npm run admin:bootstrap -- --email=<approved-address> --show-token=true
```

Complete activation at `/admin/activate`.

## Bootstrap Already Completed

Do not rerun bootstrap with force unless following an approved emergency recovery procedure. Use `users.manage` recovery routes to restore or unlock existing administrators.

## Invalid Secure Cookie

Check `AUTH_COOKIE_SECURE`, `AUTH_COOKIE_SAMESITE`, trusted proxy settings, and HTTPS termination. Do not disable secure cookies in production to mask proxy misconfiguration.

## CSRF or CORS Failure

Verify `SECURITY_CSRF_ENABLED=true` and production origins are configured. Do not use wildcard credentialed CORS.

## Redirect Loop

Ensure session endpoint returns authenticated data and return paths are internal `/admin/*` paths. `/admin/login` is rejected as a return target.

## Admin Denied

Run:

```bash
npm run admin:permissions-verify
npm run admin:authz-test
```

Confirm the user has a role that includes `admin.access`.

## Disabled or Locked Account

Use:

```bash
npm run admin:unlock -- --user=<userId>
```

Restoration or disabling must be performed by a user with proper management permissions and audited.

## Emergency Session Revocation

Run:

```bash
npm run admin:revoke-sessions -- --user=<userId>
```

## MFA Failure

MFA is not locally implemented. Production privileged access requires implemented MFA or an approved external MFA exception.
