# ANM-WEB-090 Release Operations Runbook

## Release Creation Failure

1. Confirm the admin has `releases.create`.
2. Confirm `artistId` and `title` are present.
3. Confirm the artist exists and is not deleted.
4. Review validation errors.
5. Retry with backend-generated slug if custom slug fails.

## Artist Assignment Failure

1. Confirm the artist ID exists.
2. Check artist status and publication state.
3. Use only non-deleted artist records.
4. Before publication, ensure the artist is active, published, and public.

## Slug Conflict

1. API returns `RELEASE_SLUG_CONFLICT`.
2. Choose a unique slug or omit slug and let the backend generate one.
3. Avoid changing published slugs until redirect policy is finalized.

## Cover Upload Failure

1. Confirm media upload/storage health.
2. Validate file type: JPEG, PNG, or WebP.
3. Check processing status.
4. Retry transient storage/processing failures.
5. Do not paste private/manual URLs into cover fields.

## Audio Preview Upload Failure

1. Confirm audio format is allowed.
2. Check upload job status and storage health.
3. Check audio metadata processing status.
4. Replace corrupt or unsupported files.
5. Never use a full-song file as the preview.

## Full-Song Upload Failure

1. Use private/admin-only upload target.
2. Prefer direct multipart for large files when configured.
3. Check upload session, part status, and checksum/integrity.
4. Retry failed parts where supported.
5. Confirm no public URL is created.

## Processing Failure

1. Open release processing summaries.
2. Review cover/audio/full-song asset IDs.
3. Check media processing health.
4. Retry retryable failures.
5. Replace corrupt or unsupported media.
6. Required failures should block publication according to policy.

## Duration Mismatch

1. Verify audio metadata extraction.
2. Re-run processing after transient tool errors.
3. Replace the audio if metadata is corrupt or inconsistent.
4. Do not publish a preview whose streamable output is invalid.

## Full-Song Privacy Incident

1. Immediately unpublish the release if public.
2. Run `npm run storage:verify-full-song-privacy`.
3. Remove any full-song URL from public fields or metadata.
4. Rotate/expire exposed signed URLs if applicable.
5. Record incident details without logging private URLs.

## Publication Blocked

1. Open release readiness.
2. Resolve blocking field errors and artist readiness.
3. Confirm no full-song privacy violation.
4. Confirm public media fields are public-safe.
5. Retry publish only after readiness is true.

## Public Sync Mismatch

1. Fetch the public release endpoint by slug.
2. Confirm no private or full-song fields appear.
3. Confirm assigned artist is public.
4. Invalidate public release, artist, homepage, search, and browse caches.
5. Re-run public delivery smoke.

## Failed Cover Replacement

1. Keep the previous public cover active.
2. Check upload and processing status for the replacement.
3. Promote only after the new object is verified.
4. Use version history for rollback readiness.

## Failed Audio Replacement

1. Keep the current public preview active.
2. Check audio metadata/transcode processing.
3. Confirm replacement is not a full-song asset.
4. Republish only after preview readiness passes.

## Republish Rollback

1. Do not clear `republishRequired` until the new public state is verified.
2. Preserve prior public versions.
3. Re-run publication after fixing blockers.
4. Unpublish if the current public release becomes unsafe.

## Unpublish

1. Confirm action impact.
2. Run unpublish.
3. Verify public release endpoint returns not found.
4. Confirm artist release listing no longer includes it.

## Archive And Restore

Archive removes public visibility and preserves assets. Restore returns the release to draft/non-public state.

After restore:

1. Review artist assignment.
2. Review media links and processing.
3. Run readiness.
4. Republish only after review.

## Public Playback Failure

1. Confirm public `audioPreviewUrl` exists and is public-safe.
2. Confirm CDN/origin URL resolves.
3. Confirm MIME type is browser-playable.
4. Confirm the player is not using a full-song source.
5. Reprocess/transcode preview if needed.

## CDN Mismatch

1. Compare origin and CDN URL mapping.
2. Check cache-bust/version path.
3. Invalidate CDN if configured.
4. Use origin fallback if CDN is unavailable.
