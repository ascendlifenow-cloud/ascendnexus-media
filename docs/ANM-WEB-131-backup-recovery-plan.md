# Backup / Restore / Rollback Certification

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

## Backup - FAIL - infra.backup.restore

Database backup, object-storage recovery, and restore-test evidence are missing.

Evidence:

```json
{
  "required": [
    "database backup",
    "restore test",
    "media recovery",
    "configuration backup"
  ]
}
```

## Rollback - FAIL - infra.rollback.rehearsal

Rollback command exists as a guarded workflow, but staging rehearsal evidence is missing.

Evidence:

```json
{
  "command": "npm run production:rollback -- --release=<safe-release-id>"
}
```
