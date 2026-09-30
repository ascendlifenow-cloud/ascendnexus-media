# ANM-WEB-091 Media Library Operations Runbook

## Media List Is Empty Or Missing Assets

1. Confirm the admin has `media.read`.
2. Check query filters.
3. Run upload smoke or inspect media asset persistence.
4. Confirm production seed fallback is not being mistaken for Media Library persistence.

## Upload Failure

1. Confirm `media.upload`.
2. Check file validation errors.
3. Check storage provider health.
4. Verify upload job status.
5. Retry only when bytes can be resubmitted or direct-upload session supports retry.

## Direct Upload Failure

1. Inspect direct upload session.
2. Confirm part records and session expiration.
3. Retry failed part where supported.
4. Cancel abandoned sessions when needed.
5. Never persist presigned URLs as asset URLs.

## Replacement Failure

1. Confirm `media.replace`.
2. Verify replacement `storageObjectId` exists.
3. Confirm storage object is compatible with the asset type.
4. For full-song assets, confirm replacement storage is private.
5. Retry after correcting storage or compatibility issues.
6. Previous active version remains preserved.

## Rollback Failure

1. Confirm target version exists in `GET /api/admin/media/assets/:assetId/versions`.
2. Confirm version storage object exists.
3. Check whether target storage object is public if public fields should update.
4. Retry rollback with public field updates disabled if the target is private.

## Link Assignment Failure

1. Confirm `media.link`.
2. Confirm asset is not archived/deleted.
3. Confirm field compatibility.
4. Do not assign full-song assets to audio-preview fields.
5. Do not assign audio assets to image fields.

## Detach Failure

1. Confirm link ID exists.
2. Confirm `media.link`.
3. Retry detach.
4. If asset remains assigned, inspect active links and detach remaining links as appropriate.

## Full-Song Privacy Incident

1. Run `npm run storage:verify-full-song-privacy`.
2. Demote any public full-song storage object immediately.
3. Remove public URL fields.
4. Rotate any exposed signed URLs.
5. Record incident without logging private URLs.

## Storage Reconciliation Warnings

1. Review `npm run storage:reconcile`.
2. Separate expected smoke records from real media records.
3. Do not delete provider objects automatically.
4. For real records, verify provider object existence and repair safely.

## Safe Delete

1. Inspect dependencies.
2. Detach active links where appropriate.
3. Archive before delete.
4. Prefer soft delete.
5. Hard delete only after dependency, version, storage, and audit review.

## Public Mapping Mismatch

1. Inspect asset dependencies.
2. Verify active version and storage object.
3. Verify public URL is from public storage only.
4. Invalidate public caches.
5. Re-run public delivery and storage reconciliation checks.
