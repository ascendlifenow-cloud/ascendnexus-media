# Migration Plan

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

Production migration execution is blocked until pre-migration backup and staging rehearsal evidence exist.

| Migration ID | Description | Backward Compatible | Data Mutation | Expected Duration | Lock Impact | Rollback Method | Verification Query |
| --- | --- | --- | --- | --- | --- | --- | --- |
| current-release | Use repository migration commands and schema/index checks | pending evidence | pending evidence | pending evidence | pending evidence | restore-from-backup if irreversible | npm run db:migrate:status && npm run db:indexes:check && npm run db:integrity:check |
