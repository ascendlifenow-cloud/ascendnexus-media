# Production Infrastructure Registry

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

## P1 - Production environment schema is not cutover-ready

Area: Environment
Evidence: Current process is not running with production/staging strict configuration.
Remediation: Set APP_ENV=production or staging with strict production variables and rerun production:env-verify.

## P0 - Potential committed secret material found

Area: Secrets
Evidence: 1 potential secret artifact(s) require review.
Remediation: Remove committed secret material, rotate affected credentials, and rerun production:secrets-scan.

## P0 - Production database is not verified

Area: Database
Evidence: Production database connectivity/TLS/authentication is not verified in this environment.
Remediation: Configure production MongoDB, run db health/index/integrity checks, and attach backup/restore evidence.

## P1 - Production migration rehearsal evidence is missing

Area: Migrations
Evidence: Migration inventory exists, but no production/staging migration execution evidence is recorded.
Remediation: Run controlled staging migration and production migration with backup evidence before cutover.

## P1 - Production Redis is not verified

Area: Redis
Evidence: Production Redis connectivity/TLS/namespace is not verified.
Remediation: Configure production Redis, verify TLS/authentication, and run queue/session/cache smoke checks.

## P1 - Production queue infrastructure is not verified

Area: Queues
Evidence: Production queue creation, consumers, retries, and dead-letter behavior are not verified.
Remediation: Run queue health and worker heartbeat checks against production-equivalent Redis.

## P1 - Production workers are not verified

Area: Workers
Evidence: Background/media worker deployment evidence is missing.
Remediation: Deploy worker processes, verify heartbeat/restart policy, and run production:worker-health.

## P0 - Production object storage is not verified

Area: Storage
Evidence: Object storage upload/download/private-master policy is not verified for production.
Remediation: Configure S3/R2/Supabase/Firebase storage, verify private/public policies, and run storage/CDN smoke checks.

## P1 - Production CDN is not verified

Area: CDN
Evidence: CDN origin, TLS, cache policy, range requests, and invalidation are not verified.
Remediation: Configure CDN hostname/origin/cache policy and run production:cdn-health.

## P1 - Production email delivery is not verified

Area: Email
Evidence: Verification/password-reset email delivery has not been proven through a production provider.
Remediation: Configure sender domain/provider, verify inbox delivery for verification and reset emails, and attach evidence.

## P0 - Production DNS/canonical domains are not verified

Area: DNS
Evidence: External DNS propagation and canonical host verification are not recorded.
Remediation: Verify web/API/CDN/email DNS from external resolvers and update DNS inventory.

## P0 - Production TLS is not externally verified

Area: TLS
Evidence: TLS certificate chain, hostname, expiry, redirects, and mixed-content checks are not recorded.
Remediation: Run production:tls-verify against canonical domains after deployment.

## P1 - Production security headers are not verified

Area: Security Headers
Evidence: Production HTTP security headers/CSP have not been exercised on real hosts.
Remediation: Run security header and CSP browser checks on public/admin/member critical paths.

## P1 - Production CORS/cookie/CSRF configuration is not verified

Area: CORS/Cookies/CSRF
Evidence: Production CORS/cookie/CSRF behavior is not fully verified.
Remediation: Verify exact origins with credentials, secure cookies, logout invalidation, and CSRF mutation denial.

## P0 - Production deployment/cutover evidence is missing

Area: Deployment
Evidence: No immutable production deployment, health check, smoke, or cutover evidence is recorded.
Remediation: Run controlled production deployment workflow only after environment, backup, migration, storage, email, DNS, and rollback gates pass.

## P0 - Production backup evidence is missing

Area: Backup
Evidence: Database backup, object-storage recovery, and restore-test evidence are missing.
Remediation: Create pre-cutover backup, verify readability/encryption/retention, and run isolated restore test.

## P1 - Rollback rehearsal evidence is missing

Area: Rollback
Evidence: Rollback command exists as a guarded workflow, but staging rehearsal evidence is missing.
Remediation: Run release A/B rollback rehearsal, verify DB compatibility, workers, login, and public routes.

## P1 - Production-equivalent staging deployment rehearsal is missing

Area: Staging
Evidence: Build/test/backup/migration/deploy/smoke/email/media/rollback staging evidence is missing.
Remediation: Execute ANM-WEB-131 phase 82 staging rehearsal and attach evidence.

## P0 - Production cutover verification is missing

Area: Cutover
Evidence: Production cutover has not been performed or evidenced.
Remediation: Do not cut traffic until all P0/P1 gates pass; after cutover run production infrastructure smoke and monitoring window checks.

## Counts

```json
{
  "p0Open": 8,
  "p1Open": 11,
  "p2Open": 0,
  "p3Open": 0,
  "checksPassed": 1,
  "checksWarning": 0,
  "checksFailed": 19
}
```
