# ANM-WEB-132 Rate Limits Certification

Prompt: ANM-WEB-132
Generated: 2026-08-11T16:38:21.717Z
Environment: development
Decision: SECURITY BLOCKED

## Scope
Rate Limits controls were evaluated from server configuration, local persisted evidence, certification services, and inherited infrastructure state. Production/live evidence is explicitly called out when missing.

## Checks
| Check | Area | Status | Summary |
|---|---|---|---|
| security.rate_limits | Rate Limits | fail | Rate limits are not verified in a production-like runtime. |

## Open Issues
- P1 security.rate_limits: Production rate limits are not verified. Rate limits are not verified in a production-like runtime. Remediation: Verify public, auth, admin, media, upload, protected-content, billing, and export/import rate limits with deployed Redis/backing store evidence.
