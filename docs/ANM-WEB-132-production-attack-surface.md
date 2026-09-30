# ANM-WEB-132 Production Attack Surface

Prompt: ANM-WEB-132
Generated: 2026-08-11T16:38:21.717Z
Environment: development
Decision: SECURITY BLOCKED

| Surface | Exposure | Controls | Status | Residual Risk |
|---|---|---|---|---|
| Public website and public APIs | Internet | public DTO scanner, guest projection filtering, CORS/header policy | warn | Live browser/network scans are still required on the deployed domain. |
| Member APIs and protected media | Authenticated internet | member session, entitlement evaluation, short-lived media authorization | warn | Production protected fixture and CDN/service-worker evidence are pending. |
| Admin APIs | Authenticated admin internet/LAN | admin RBAC, admin session, audit events, CSRF readiness | fail | Production admin mutation CSRF and origin tests are pending. |
| Object storage and CDN | Public and private media delivery | public/private prefixes, public-safe promotion, protected gateway | fail | Provider IAM, CDN origin isolation, and cache behavior need live evidence. |
| Workers, queues, and media intake | Internal services and watched folders | allowed folders, validation, assignment review, worker health | warn | Production worker/queue/dead-letter monitoring remains unverified. |
| Billing/webhooks/export-import | Authenticated admin/member/provider callbacks | signature readiness, admin permissions, package signing/encryption | warn | Live provider credentials and webhook signature evidence are pending. |
