# Production Architecture

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

| Component | Provider | Region/Endpoint | Exposure | Authentication | Health Check | Backup | Scaling | Failure Impact |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Public Frontend | Production web host or static artifact host | pending | Public HTTPS | None for public routes; member session for protected routes | Public smoke + /health/ready via API | Immutable build artifact retained | Horizontal web/static scaling | Public/member experience outage |
| Admin Frontend | Same React app under /admin | pending | Authenticated HTTPS path | Admin session + RBAC | Admin smoke and route refresh | Immutable build artifact retained | Same as frontend | Admin operations blocked |
| Backend/API | Node.js API runtime | pending | HTTPS API | Cookie sessions, CSRF, RBAC/entitlements | /health, /health/ready, /health/live | Previous release artifact retained | Horizontal API replicas readiness | Site/member/admin API outage |
| Database | MongoDB | pending | Private network | Connection string secret | db health/index/integrity | Snapshot/backup plus restore test | Managed capacity/pool sizing | Canonical data unavailable |
| Redis/Queues | Redis/BullMQ | anm-media | Private network | Redis URL secret | queue and Redis health | Redis recovery policy; canonical data outside Redis | Managed memory/concurrency | Queues, cache, sessions degraded |
| Workers | Node worker processes | development | Private runtime | Environment secrets | worker heartbeat | Redeploy previous worker artifact | Queue concurrency controls | Media/email/publication jobs stall |
| Object Storage | local | auto | Private masters + public derivatives | Storage credentials secret | storage health + private/public checks | Provider durability/versioning/backup policy | Provider managed | Media upload/delivery failure |
| CDN | none | pending | Public HTTPS CDN | Origin policy/signing where required | CDN smoke/TLS/range/purge | Origin fallback/rollback policy | CDN edge scaling | Public media unavailable or stale |
| Email Provider | disabled | pending | Provider API/SMTP | Email provider secret | verification/reset delivery test | Provider logs and retry queue | Provider rate limits | Registration/reset blocked |
| Observability | none | development | Operator-only | Monitoring DSN/key secret | observability health | Log/metric retention policy | Provider managed | Reduced incident detection |
