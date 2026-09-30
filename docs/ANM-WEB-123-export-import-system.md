# ANM-WEB-123 Export Import System

Implemented capabilities:

- Artist, release, Media Library, mixed, and full-content export jobs.
- `.anmexport` manifest with package version, schema version, app version, source environment, selections, counts, byte totals, dependency policy, publication policy, access-policy mode, and warnings.
- Explicit record envelopes for artists, releases, media assets, media assignments, and galleries.
- Binary media inclusion with SHA-256 checksums when files exist and policy permits inclusion.
- Private package storage and short-lived admin download authorization.
- Import package upload, quarantine, inspection, checksum verification, dry-run, conflicts, create-only draft import, verification, and rollback.
- Admin routes `/admin/exports`, `/admin/exports/new`, `/admin/imports`, `/admin/imports/new`.
- Admin APIs under `/api/admin/exports` and `/api/admin/imports`.
- CLI commands for export, inspect, dry-run, rollback, and health.

Security posture:

- No raw storage credentials, signed URLs, passwords, sessions, or secrets are exported.
- Imports do not trust package file paths as target storage paths.
- Dry-run performs no mutation.
- Existing records are not overwritten silently.
- Imported content defaults to draft/unpublished.
