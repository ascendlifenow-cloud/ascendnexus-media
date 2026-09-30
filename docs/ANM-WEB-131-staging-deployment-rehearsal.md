# Staging Certification

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

## FAIL - infra.staging.rehearsal

Build/test/backup/migration/deploy/smoke/email/media/rollback staging evidence is missing.

Evidence:

```json
{
  "requiredSequence": "build, env, backup, migrate, deploy, workers, storage, CDN, email, public/member/admin smoke, rollback"
}
```
