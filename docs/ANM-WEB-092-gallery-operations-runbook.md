# ANM-WEB-092 Gallery Operations Runbook

## Create Or Edit Failure

Check the API response for normalized errors such as slug conflicts, invalid source association, missing title, unsupported media type, or unsafe URL. Retry after correcting the field-level issue.

## Slug Conflict

Choose a unique lowercase, hyphen-separated slug. Reserved routes such as `admin`, `api`, `gallery`, `artists`, and `songs` are rejected.

## Publish Blocked

Review `/api/admin/gallery/:galleryItemId/readiness`. Common blockers:

- missing public-safe image URL
- missing alt text
- linked artist is not active/published
- linked release is not published
- invalid source ID combination
- unsupported media type

## Public Item Missing

Verify the item is `published`, `publicationState` is `published`, and `publicVisibility` is true. Confirm the image URL is public-safe and the source artist/release is public if source-linked.

## Ordering Mismatch

Use the admin list controls to save current order again. If another admin changed order concurrently, reload the gallery list before saving.

## Archive Or Unpublish

Archive and unpublish immediately set `publicVisibility` false and invalidate gallery caches. Uploaded media is preserved.

## Restore

Restore returns the item to draft and non-public state. Review readiness and publish again after confirming media/source state.

## Private Media Incident

If a private or signed URL appears in gallery data, immediately unpublish/archive the item, remove the unsafe URL, inspect audit history, and run public delivery smoke checks. Treat signed URL or private path exposure as a critical issue.

## Staging Verification

Before launch, run the gallery E2E against staging with real object storage and CDN:

1. Create gallery item.
2. Upload image.
3. Wait for processing.
4. Publish.
5. Confirm public API/page image URL resolves.
6. Reorder.
7. Confirm public order changed.
8. Unpublish/archive.
9. Confirm public route no longer resolves.
