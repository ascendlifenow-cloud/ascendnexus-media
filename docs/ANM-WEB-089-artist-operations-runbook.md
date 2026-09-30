# ANM-WEB-089 Artist Operations Runbook

## Artist Creation Failure

1. Confirm the admin has `artists.create`.
2. Check required fields: `name` and `displayName`.
3. Review API error code and field message.
4. Retry with a normalized slug or omit slug to let the backend generate one.
5. If persistence fails, run database health and integrity checks before retrying.

## Slug Conflict

1. The API returns `ARTIST_SLUG_CONFLICT`.
2. Choose a unique slug or allow generated suggestions.
3. Avoid changing published slugs casually because redirects are not finalized in this prompt.
4. If duplicate slugs exist despite validation, run database integrity checks.

## Image Upload Failure

1. Confirm media upload permissions and storage health.
2. Verify the file is JPEG, PNG, or WebP.
3. Check storage provider health and upload job status.
4. Retry upload after transient provider errors.
5. Do not paste manual private storage URLs into artist public fields.

## Image Processing Failure

1. Open the artist processing summary.
2. Confirm linked asset ID and active version.
3. Check media processing health and tool availability.
4. Retry failed processing jobs when retryable.
5. Replace the artwork if the source file is corrupt or unsupported.
6. Do not publish private or unprocessed artwork manually.

## Publication Blocked

1. Open artist readiness.
2. Resolve blocking issues first.
3. Review warnings for optional artwork and external-link concerns.
4. Confirm required processing is completed.
5. Confirm public-safe URLs can be generated for artwork selected for publication.
6. Retry publish only after readiness is true.

## Public Sync Mismatch

1. Confirm the artist record is `status = active`, `publicationState = published`, and `publicVisibility = true`.
2. Invalidate public artist and artist list caches.
3. Run public delivery smoke checks.
4. Verify public payload contains no private paths.
5. If CDN/origin URLs mismatch, run storage reconciliation and public asset sync checks.

## Failed Artwork Replacement

1. Keep the previous public version active.
2. Check the new version upload and processing jobs.
3. Do not switch public fields until the new version is verified public-safe.
4. Retry processing or replace with a new file.
5. Use version history for rollback readiness when the media version service is available.

## Unpublish With Published Releases

Current safe behavior hides the artist publicly when unpublished. Public artist detail and artist list endpoints stop resolving the artist.

Operationally:

1. Review release dependencies before unpublishing.
2. Decide whether dependent releases should also be unpublished or remain inaccessible through artist routes.
3. Run public delivery checks after unpublish.
4. Document any release-side follow-up in the release workflow.

## Archive Dependencies

1. Review releases, gallery items, homepage references, SEO/social metadata, and media links before archiving.
2. Archive removes artist public visibility immediately.
3. Preserve media and history.
4. Run public delivery checks to confirm the artist is hidden.
5. Use restore when the artist needs to return to draft review.

## Restore Procedure

1. Restore the artist.
2. Confirm status is draft and public visibility is false.
3. Review media links and processing state.
4. Re-run readiness.
5. Publish only after readiness passes.

## Public Page Mismatch

1. Fetch public artist API by slug.
2. Confirm no draft/private fields appear.
3. Confirm profile/banner/character URLs are public-safe.
4. Invalidate public caches.
5. Re-run public delivery smoke.
6. If the mismatch persists, inspect artist repository record and public sanitization output.

## Rollback Guidance

Artist lifecycle rollback should prefer safe state changes:

- Published issue: unpublish first.
- Bad public artwork: republish with previous verified media version where available.
- Bad metadata: patch artist draft, then republish.
- Bad archive: restore to draft, validate, then republish.

Do not hard-delete artist or media records to recover from publication issues.
