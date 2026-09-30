# ANM-WEB-124 Restore Mode

Restore mode is not a normal import action. It is reserved for controlled disaster recovery or isolated environment rebuilds.

Current controls:
- Backend route requires `imports.restore`.
- Execution requires a restore plan.
- Restore without a plan returns `IMPORT_RESTORE_PLAN_REQUIRED`.
- Production restore must remain non-destructive unless explicit isolated test records and approvals exist.

Future production restore should integrate environment snapshots, queue pause, maintenance mode, storage-capacity checks, and two-person approval.
