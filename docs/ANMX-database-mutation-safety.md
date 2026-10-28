# Targeted legacy MongoDB mutations

Date: October 27, 2026 (America/Denver).

## Implemented boundary

`JsonDatabase.update()` now keeps its original snapshot and a separate mutable clone. It computes changes by registered collection and application identifier, then validates and writes only changed records inside one MongoDB transaction. Unchanged collections are not written. Concurrent unrelated inserts, edits and deletions are preserved. A changed record that differs from the original snapshot causes a conflict instead of replacing newer data. The mutator is not rerun during driver transaction retries.

Identifiers in changed collections must be present and unique. A no-op mutation starts no write transaction. Record removal uses a narrowly identified `deleteOne`, never collection-wide deletion. Transaction failure rolls back the entire changed-record set. Errors do not include record bodies, credentials or media paths.

Independent reviewer Anscombe identified a legacy publication-sync producer/registry mismatch. New statuses now receive deterministic entity-based IDs. Old statuses without IDs are matched by entity type, entity ID and absent ID, checked for conflicts, then lazily given a stable ID when changed. Duplicate legacy entity identities fail closed. A read-only staging registry audit found one such legacy sync status and no missing IDs in other registered collections; no live migration was performed.

This uses the existing connection/session infrastructure. MongoDB must support transactions (the staging Atlas deployment does). No unsafe fallback to nontransactional snapshot replacement is provided.

## Verification

- `npm run test:database-snapshot-changes`: deterministic delta planning; missing/duplicate identifiers; targeted inserts, replacements and deletes; stale conflict; unchanged data; real update-wrapper transaction propagation, no-op behavior and rollback using a test double.
- `node --env-file=.env.migration.local --import tsx scripts/snapshot-changes-staging-test.ts --environment=staging --execute`: real MongoDB targeted update, preservation of unrelated concurrent changes, stale rejection and transaction rollback. Uses a new disposable collection only; removes it afterward. No application records modified. Executed successfully before deployment.
- Existing Agent Status and private production-cover regression tests passed.
- Existing local publication-workflow smoke test passed, including normal publication and full-song privacy. Managed production approval remains separately locked.
- Independent read-only review by Anscombe found the sync-ID mismatch; the compatibility fix resolved the blocking finding. The real isolated staging test subsequently covered its compound-filter/lazy-ID path too.
- Typecheck and production build passed; pre-existing bundle-size warnings remain.

## Remaining limitations

- `update()` still reads the whole registered snapshot, so this is a data-integrity improvement, not a completed query-performance refactor.
- Explicit `JsonDatabase.write()` retains legacy full-snapshot semantics. Current source scan found its direct call only in an isolated test; do not use it for live imports or automation. It remains a separate migration boundary.
- Targeted repository patch operations remain the preferred API. Cross-record constraints require explicit service transactions; this change does not turn every existing workflow into a transaction.
- Snapshot-based stale edits fail safely but callers may currently show a generic save error. Reload and retry; automatic reapplication of user edits is not implemented.
- Local JSON persistence and cross-process local locking are unchanged.
- This does not enable managed-song publication. The exact-approval public executor remains locked and is the next separate implementation assignment.
