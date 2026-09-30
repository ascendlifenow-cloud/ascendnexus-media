# ANM-WEB-095 Publication Operations Runbook

## Publication Blocked

Open the operation detail and inspect `blockingIssues`, failed stage, and readiness. Fix the entity, media, metadata, or linked-content issue, then retry with the same target version or republish with a new `targetVersion`.

## Full-Song Privacy Block

If an operation reports a full-song or private path exposure, stop publication and inspect the entity public mapper. Full-song masters must remain private and must not appear in public release payloads, metadata, structured data, CDN mappings, or audit snapshots.

## Lock Conflict

Use:

```bash
npm run publication:locks
```

If the lock is active and recent, wait for the operation to finish. If it is stale, run:

```bash
npm run publication:recover-stale
```

Recovery expires stale locks and marks old active operations failed so they can be retried deliberately.

## Stale Operation

Check `/api/admin/publication/health`. A degraded state with old active operations means a worker/API process likely stopped during publication. Run stale recovery, inspect the failed operation, and retry only after confirming no duplicate public activation is in progress.

## Public Sync Mismatch

Fetch the relevant public API route and compare it to the operation public representation. Confirm cache invalidation occurred in `PublishedContentSyncStatus`. If the entity is correct but public data is stale, republish or run environment cache/CDN invalidation.

## Retry

Retry only blocked, failed, or warning-completed operations after the underlying issue is fixed. For content changes, prefer a new `targetVersion` so idempotency does not return an older completed operation.

## Rollback

Use rollback for media publication operations or site configuration versions where previous public state exists. Confirm public APIs after rollback and keep the failed operation for audit history.

## Cancel

Cancel only operations that have not already activated public delivery. After canceling, verify the public API still serves the previous known-good version.

## Unpublish Or Archive

Unpublish and archive bypass publish-readiness to remove content from public delivery immediately. Verify the public route returns not found or omits the entity from lists.

## Health Check

Use:

```bash
npm run publication:health
```

Expected local result is `ok` or `degraded` with explicit failed/blocked counts. A degraded state is acceptable after intentional privacy-block tests, but production should review and resolve each failed operation.

## Verification

Use:

```bash
npm run publication:verify
```

The smoke creates test content, publishes through the central endpoint, verifies idempotency, confirms public delivery, checks full-song privacy, unpublishes, and runs stale recovery.
