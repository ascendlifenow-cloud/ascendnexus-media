# ANM-WEB-132 Security Control Inventory

Prompt: ANM-WEB-132
Generated: 2026-08-11T16:38:21.717Z
Environment: development
Decision: SECURITY BLOCKED

| Control | Category | Owner | Enforcement | Status | Evidence |
|---|---|---|---|---|---|
| auth.admin.enabled | authentication | security | admin session middleware | fail | Admin authentication configuration is server-side. |
| auth.member.separate | authentication | identity | member session middleware | pass | Member and admin models/sessions are separate stores. |
| authz.admin.rbac | authorization | security | RequirePermission and mediaAuthorizationService | pass | 164 admin permissions registered. |
| media.full_song.private | media | media | storage/public projection/protected gateway | pass | Full-song exposure scanner is part of this certification. |
| cors.allowlist | web | security | HTTP middleware | warn | Credentialed wildcard CORS is not approved. |
| csrf.mutations | web | security | HTTP mutation middleware | fail | CSRF must be enabled for production credentialed mutation flows. |
| headers.csp | web | security | HTTP response headers | fail | CSP setting is centrally configured. |
| rate_limits.sensitive | abuse | security | rate-limit middleware | fail | Auth/public/admin threshold config exists. |
| privacy.log_redaction | privacy | platform | logger/config redaction | pass | 13 redaction fields configured. |
| observability.alerts | operations | ops | monitoring and alert policies | fail | Monitoring provider: none. Health: blocked. |
| recovery.backup_restore | recovery | ops | backup/restore/rollback procedures | fail | INFRASTRUCTURE BLOCKED |
