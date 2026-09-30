# Production Rollback Plan

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

Rollback triggers include health failure, authentication failure, public/admin outage, database error spike, media delivery failure, email verification failure, protected-media exposure, migration failure, and critical security issue.

Rollback command: `npm run production:rollback -- --release=<safe-release-id>`.

Irreversible migrations require restore-from-backup and explicit compatibility review before application rollback.
