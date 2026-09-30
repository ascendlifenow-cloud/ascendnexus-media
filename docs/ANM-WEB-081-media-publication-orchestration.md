# ANM-WEB-081 Media Publication Orchestration

## Purpose

Uploaded media remains private by default. Public delivery only happens through a publication operation that validates the parent entity, linked media, required processing, storage readiness, public-safe asset types, CDN readiness, and public sync verification.

## Lifecycle

1. Create a `MediaPublicationOperation`.
2. Acquire an entity/action lock.
3. Validate entity and asset readiness.
4. Check required processing completion.
5. Promote approved private storage into a versioned public storage record.
6. Update the media asset public URL and publication metadata.
7. Activate CDN-ready URLs when configured.
8. Run public asset sync verification.
9. Complete, complete with warnings, block, fail, or roll back.

## Private-First Rules

- Uploading never makes media public.
- Private/source storage objects are preserved.
- Public delivery creates a separate public storage object record.
- Full-song assets are always classified `private_only` and are skipped unless a future explicit policy changes that.
- Draft, admin-only, pending, failed, and unassigned assets are not public-safe.

## Required vs Optional

Required assets must be present, storage-ready, and required-processing-ready. Required failures block publication.

Optional assets can publish with warnings when processing or promotion is incomplete.

## Rollback

Rollback preserves previous public versions where possible, restores prior public URLs from metadata, marks the operation `rolled_back`, records an audit event, and never deletes source/private uploads.

## Unpublish and Archive

Unpublish and archive hide content immediately by updating media asset publication metadata and status. Physical demotion or CDN invalidation can follow later; public hiding does not wait on storage cleanup.

## API Routes

- `GET /api/admin/publication/:entityType/:entityId/readiness`
- `POST /api/admin/publication/:entityType/:entityId/publish`
- `POST /api/admin/publication/:entityType/:entityId/unpublish`
- `POST /api/admin/publication/:entityType/:entityId/archive`
- `POST /api/admin/publication/:entityType/:entityId/restore`
- `GET /api/admin/publication/operations`
- `GET /api/admin/publication/operations/:publicationOperationId`
- `POST /api/admin/publication/operations/:publicationOperationId/retry`
- `POST /api/admin/publication/operations/:publicationOperationId/rollback`
- `POST /api/admin/publication/operations/:publicationOperationId/cancel`

## Permissions

Development auth grants:

- `publication.read`
- `publication.publish`
- `publication.unpublish`
- `publication.archive`
- `publication.restore`
- `publication.rollback`
- `publication.retry`
- `publication.cancel`

## Queue and Worker

Queue: `media-publication`

Script:

```bash
npm run media:worker:publication
```

Configuration:

- `MEDIA_PUBLICATION_WORKER_CONCURRENCY`
- `MEDIA_PUBLICATION_MAX_ATTEMPTS`
- `MEDIA_PUBLICATION_BACKOFF_MS`
- `MEDIA_PUBLICATION_TIMEOUT_MS`

## Failure Codes

Publication errors use normalized `PUBLICATION_*` codes such as:

- `PUBLICATION_ENTITY_NOT_FOUND`
- `PUBLICATION_ASSET_MISSING`
- `PUBLICATION_PROCESSING_PENDING`
- `PUBLICATION_PROCESSING_FAILED`
- `PUBLICATION_STORAGE_PROMOTION_FAILED`
- `PUBLICATION_SYNC_FAILED`
- `PUBLICATION_OPERATION_NOT_FOUND`
- `PUBLICATION_OPERATION_NOT_RETRYABLE`

## Verification

Run:

```bash
npm run typecheck
npm run test:media-publication
npm run test:media-processing
npm run build
```
