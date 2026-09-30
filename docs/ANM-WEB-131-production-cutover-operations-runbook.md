# Production Cutover Operations Runbook

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

## Verification Commands

```bash
npm run production:env-verify
npm run production:secrets-scan
npm run production:db-health
npm run production:redis-health
npm run production:queue-health
npm run production:worker-health
npm run production:storage-health
npm run production:cdn-health
npm run production:email-health
npm run production:dns-verify
npm run production:tls-verify
npm run production:infra-smoke
npm run production:certify-infrastructure
```

## Emergency Actions

- Production environment invalid: stop deployment and repair secret/config references.
- Database unavailable: keep traffic on previous release; do not run migrations.
- Migration fails: stop promotion, preserve backup, inspect migration lock/state.
- Storage upload failure: disable media intake/uploads if needed and verify private buckets remain private.
- Email failure: disable public registration if verification email is launch-required.
- DNS/TLS invalid: do not cut traffic to canonical host.
- CORS/cookie failure: roll back config or release; do not use wildcard CORS with credentials.
- Smoke test failure: keep previous release active and run rollback workflow.
- Protected media exposure: trigger emergency deny/takedown and rotate affected delivery credentials.
