# ANM-WEB-123 Export Import Operations Runbook

- Export stuck: check `/api/admin/exports`, `npm run export:health`, and private package storage.
- Export failed: inspect job errors and retry with a smaller selection.
- Missing asset: verify storage object exists under the configured upload root; export reports missing files as warnings.
- Download expired: re-authorize package download from `/admin/exports`.
- Import invalid: inspect package structure and checksum report.
- Dry run fails: do not execute; resolve compatibility or checksum errors first.
- Conflict unresolved: choose a safe resolution or use create-only skip.
- Publication preservation blocked: import as draft and publish through normal readiness workflow.
- Rollback failure: inspect created IDs in the import job and remove only unreferenced imported records.
- Emergency disable: revoke import/export permissions from affected admin roles.

Verification commands:

- `npm run export:health`
- `npm run export:artist -- --artist=<artist-id>`
- `npm run export:release -- --release=<release-id>`
- `npm run export:media -- --asset=<asset-id>`
- `npm run import:inspect -- --package=<path>`
- `npm run import:dry-run -- --package=<path>`
