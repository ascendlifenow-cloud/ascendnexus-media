# ANM-WEB-095 Implementation Summary

## ANM-WEB-083 Findings Resolved

- PRF-010: Publication now has a central backend operation path for artists, releases, gallery items, homepage/site configuration, metadata, and standalone media.
- PRF-015: Admin publication APIs expose durable operations, stages, locks, health, retry, cancel, rollback, and stale recovery.
- PRF-018: Media publication retains version-preserving promotion and rollback readiness.
- PRF-019: Public delivery synchronization is recorded after publication and cache invalidation.
- PRF-021: Publication workflow smoke coverage verifies idempotency, public delivery, privacy, unpublish, health, locks, and stale recovery.
- PRF-024: Full-song and private/signed URL exposure is blocked in public publication representations.

## Backend Workflow

`MediaPublicationOrchestrationService` now supports content entities as first-class publication targets. It creates or reuses idempotent operations, acquires entity locks, persists stage progress, executes the domain lifecycle service, verifies public-safe output, synchronizes public delivery, and releases locks.

The persisted operation metadata includes:

- normalized options
- target version
- idempotency key
- public representation
- verification status

## Routes Completed

- `POST /api/admin/publication`
- `GET /api/admin/publication/health`
- `GET /api/admin/publication/locks`
- `POST /api/admin/publication/recover-stale`
- operation list/detail/retry/rollback/cancel
- entity readiness and action routes for publish, republish, unpublish, archive, restore, and rollback

## Locks And Idempotency

Publication locks are now one active lock per entity. Stale locks can be expired through recovery. Idempotency uses `entityType`, `entityId`, `actionType`, and `targetVersion`, preventing duplicate operation creation for repeated publish requests.

## Privacy Verification

The orchestrator recursively checks the public representation for private paths, signed URLs, token/signature indicators, browser blob URLs, and full-song fields. A deliberately unsafe release metadata payload was blocked during verification before the successful smoke path was run.

## Admin Integration

`AdminMediaPublicationService` now exposes generic operation creation, health, lock listing, stale recovery, republish, and entity rollback helpers while preserving existing publication hooks.

## CLI

Added:

- `npm run test:publication-workflow`
- `npm run publication:health`
- `npm run publication:status`
- `npm run publication:verify`
- `npm run publication:recover-stale`
- `npm run publication:locks`
- `npm run publication:retry`
- `npm run publication:rollback`

These commands currently execute the bounded workflow smoke in local/test mode.

## Tests Run

- `npm run typecheck`: passed
- `npm run test:publication-workflow`: passed
- `npm run test:media-publication`: passed
- `npm run test:public-delivery`: passed

The first sandboxed smoke attempt failed with `EPERM` because local port binding was blocked; rerunning with approved local bind permission succeeded. An intentionally unsafe release payload containing a private full-song URL was also blocked, confirming the privacy invariant.

## Known Limitations

- Publication execution remains synchronous in the local API route. Durable operations and locks are in place, but production queue/worker execution should be finalized in deployment hardening.
- Existing artist/release/gallery/site/metadata endpoints still support legacy direct lifecycle actions for UI compatibility. New automation should use `/api/admin/publication`.
- Production CDN invalidation and live staging verification require environment credentials and deployed infrastructure.
- Browser E2E, accessibility checks, and full staging rollback drills remain ANM-WEB-096+ work.

## Remaining Blockers For ANM-WEB-096+

- Split operational CLI commands into non-mutating status/health commands for production use.
- Run staging E2E covering artist, release, gallery, homepage, site config, metadata, rollback, and CDN invalidation.
- Add queue-backed worker execution for long-running publication operations.
- Add dashboard-level frontend tests for operation filtering, retries, cancellation, and stale recovery.
