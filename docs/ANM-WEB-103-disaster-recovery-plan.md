# ANM-WEB-103 Disaster Recovery Plan

## Scenarios

- Database loss: restore latest encrypted backup to isolated cluster, verify migrations/indexes, switch application secret binding after validation.
- Redis loss: recreate instance/namespace, recover sessions/rate limits as degraded, allow BullMQ retries/dead-letter recovery.
- Object storage loss: restore versioned objects or replicated bucket, reconcile database references, reverify full-song private prefixes.
- CDN failure: bypass to storage only when public-prefix safety and HTTPS are preserved, invalidate stale public assets.
- DNS compromise: lock registrar/DNS, rotate API tokens, restore known-good records, inspect for takeover.
- TLS failure: renew/replace certificate, verify redirect/HSTS before traffic approval.
- Bad API/client/worker release: use rollback service and previous verified release compatibility plan.
- Corrupt migration: stop deploy, restore backup or apply forward repair only after compatibility review.
- Deployment credential compromise: revoke credentials, rotate secrets, inspect deployment/audit logs.

Every recovery must validate public site, admin login, API readiness, workers, storage/CDN, full-song privacy, and security launch gate before closure.
