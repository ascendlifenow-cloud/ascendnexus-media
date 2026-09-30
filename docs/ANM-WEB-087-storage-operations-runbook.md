# ANM-WEB-087 Storage Operations Runbook

## Provider Outage

1. Check `npm run storage:health`.
2. Confirm provider dashboard availability.
3. Verify bucket and endpoint configuration.
4. Pause publish/promote operations if writes or copies fail.
5. Keep public delivery active through existing public objects and CDN cache where possible.

## Failed Upload

1. Inspect upload job errors.
2. Confirm the provider object does not exist or is incomplete.
3. Retry with the original file.
4. Do not create ready storage records manually.

## Missing Object

1. Run `npm run storage:reconcile`.
2. Verify the storage object path in the database record.
3. Check provider console for the object.
4. Mark records for manual review if missing.
5. Do not delete related media assets until recovery/retention policy is confirmed.

## Failed Promotion

1. Confirm private source object exists.
2. Confirm provider copy support.
3. Retry promotion.
4. Existing public version remains active unless explicitly demoted.

## CDN Outage

1. Public storage origin URL remains fallback.
2. Disable CDN transformation if needed.
3. Avoid deleting public origin objects during outage.

## Signed URL Failure

1. Confirm admin has `media.generate_signed_url`.
2. Confirm object is private/admin-only and not archived/deleted.
3. Confirm provider signing configuration.
4. Never paste signed URLs into logs or tickets.

## Orphan Review

1. Run reconciliation.
2. Cross-check upload sessions, processing jobs, versions, and media links.
3. Mark reviewed or ignored.
4. Delete only after retention and backup rules allow.

## Full-Song Privacy Incident

1. Treat any public full-song URL as critical.
2. Demote or clear public URL immediately.
3. Invalidate CDN if configured.
4. Re-run `npm run storage:verify-full-song-privacy`.
5. Record an incident audit event.

## Credential Rotation

Rotate credentials in provider console, update backend environment variables, restart API/workers, then run storage health. Never store provider credentials in frontend env or database records.

## Safe Delete

Hard delete remains disabled by default. Use only when records have no dependencies, are archived/deleted, and provider deletion succeeds. If provider deletion fails, do not remove the database record.
