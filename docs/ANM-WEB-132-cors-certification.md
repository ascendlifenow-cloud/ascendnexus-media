# ANM-WEB-132 CORS Certification

Prompt: ANM-WEB-132
Generated: 2026-08-11T16:38:21.717Z
Environment: development
Decision: SECURITY BLOCKED

## Scope
CORS controls were evaluated from server configuration, local persisted evidence, certification services, and inherited infrastructure state. Production/live evidence is explicitly called out when missing.

## Checks
| Check | Area | Status | Summary |
|---|---|---|---|
| security.cors.csrf | CORS | fail | CORS allowlist and CSRF protection need deployed strict-mode evidence. |

## Open Issues
- P1 security.cors.csrf: CORS and CSRF are not production-certified. CORS allowlist and CSRF protection need deployed strict-mode evidence. Remediation: Run deployed origin preflight/mutation tests and enable CSRF for credentialed admin/member mutations.
- P1 security.inherited.infra.cors_cookie_csrf: Production CORS/cookie/CSRF configuration is not verified. Production CORS/cookie/CSRF behavior is not fully verified. Remediation: Verify exact origins with credentials, secure cookies, logout invalidation, and CSRF mutation denial.
