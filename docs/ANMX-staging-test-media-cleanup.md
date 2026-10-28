# Staging Test Media Cleanup

User authorization: continue staging media cleanup and remove smoke/test files. This concerns test data in the application, not test source code, real songs, real artwork, production data, or publishing.

## Safety Boundaries

- Recognize only known fixture titles from development smoke/debug uploads. A real song titled "Smoke and Mirrors" or "The Test of Time" is not a test fixture.
- Dry run by default; apply requires explicit staging database and confirmation.
- Inspect non-audit application records for exact asset IDs and delivery references. Referenced fixtures, storage-owned fixtures, and actively processing fixtures are blocked, not force-deleted.
- Before deletion, write a private, exclusive-created backup outside the repository. Remove fixture assets and fixture-owned operational records in one MongoDB transaction; preserve audit/history records.
- Recheck record snapshots and references before deletion. Verify that catalog, storage records, and all non-test media are unchanged. No broad JSON-database rewrites.
- Handle leftover objects separately: only exact public staging R2 paths from the verified fixture backup, with explicit staging bucket guard, live-reference checks, and HEAD verification. No guessed private paths, arbitrary buckets, or local filesystem deletion.
- Provider deletion and MongoDB audit cannot be one transaction. A retry checks object existence; operators must keep the private backup until verification finishes.

## Commands

```sh
node --env-file=.env.migration.local --import tsx scripts/staging-test-media-cleanup.ts --environment=staging
node --env-file=.env.migration.local --import tsx scripts/staging-test-media-cleanup.ts --environment=staging --apply --confirm-delete-test-media --backup=/private/tmp/anm-test-media-backup-UNIQUE.json
node --env-file=.env.migration.local --import tsx scripts/staging-test-object-cleanup.ts --environment=staging --backup=/private/tmp/anm-test-media-backup-UNIQUE.json
node --env-file=.env.migration.local --import tsx scripts/staging-test-object-cleanup.ts --environment=staging --backup=/private/tmp/anm-test-media-backup-UNIQUE.json --apply --confirm-delete-test-media
node --env-file=.env.migration.local --import tsx scripts/staging-media-duplicate-audit.ts --environment=staging --report=/private/tmp/anm-duplicate-audit-UNIQUE.json
npm run test:media-fixture-policy
```

The duplicate audit is read-only. It hashes actual image bytes only from approved staging public delivery, without redirecting or logging URLs. Each object has a 15 MiB verification cap and a timeout. Stored metadata hashes alone do not establish duplication. Private audio is never downloaded for this audit. Do not archive/delete a real asset merely because its filename matches or its delivery URL is missing.

## Execution Evidence

On 2026-10-27 America/Denver, dry run found 50 verified fixtures without blockers. Apply run `eaaf5b77-8164-4607-ab50-643881f811d2` removed all 50 asset records plus one dependent record. No registered storage objects existed for these fixtures. Non-test catalog, media, and storage fingerprints were unchanged. Final assignment totals at this stage: 426 assigned, 96 unassigned, no detached assets. The private backup is retained outside Git.

The occupied-slot audit assessed 75 real-media candidates. None was proven byte-identical: 63 remained unverified and 12 required unsupported/missing-target review. Of those 63, 61 had missing candidate URLs but working assigned replacements, one had both candidate and assigned URLs missing, and one had no approved public candidate URL with a working replacement. No real artwork was deleted or archived. These records need storage repair or explicit archival review, not speculative reassignment.

Tests: 15 fixture-policy checks and 15 reconciliation checks passed; application TypeScript check passed. Real staging deletion used targeted transactions and audit events. Authenticated UI testing remains manual; refresh Media Library and Media Review to clear previously fetched query results.

R2 existence check `4523c6d2-5baf-434e-b9cd-f54f4713cebf` inspected all 22 exact public object references from the fixture backup: all 22 were already absent, zero remote objects deleted. The other fixture URLs were relative/mock or absent; no local/private key was guessed. This is not a claim that every historical local upload directory was purged.

The first read-only object check was stopped to replace repeated collection scans with an existence-first check; it performed no mutations. No real-media duplicate was approved for deletion. Refreshing existing browser sessions is required to clear fetched lists; this run did not validate authenticated browser cache behavior.

Final repeat check `1eacadb3-0145-4629-a197-7a0c4090cd1b` found zero known fixtures and made zero changes. Catalog/non-test-media integrity remained unchanged.

## Follow-Up: 107 Review Items

The user approved keeping current artwork and reversibly archiving checksum-confirmed duplicates, then explicitly approved the same treatment for audio. A follow-up source-code inventory identified 11 additional test records: nine publication-smoke full songs with generic titles and two development seed media records. Exact fixture IDs and titles are both required for these cases. They were unreferenced and removed with a private backup; there were no public R2 objects to delete.

Archived 77 redundant artwork records and six older full-song records. The original upload SHA-256 was checked against actual current assigned bytes. The old artwork originals were not available locally; do not describe this as comparing two freshly read original files. Protected audio was verified from registered staging R2 objects using short-lived, in-memory signing artifacts; no URLs, paths, or tokens were logged. No media bytes were deleted or promoted.

Two stale `metadata.mediaAssetId` references and one stale active cover-art link were reconciled to the already-current canonical artwork. Current artwork, lyrics, release state, membership/access policies, media URLs and storage records were preserved. Historical `previousCoverArtAssetIds` references remain intact; archival preserves their records. Diagnostic release IDs from the initial small archival pass were corrected in three records with append-only audit events. Regression tests now explicitly distinguish release IDs from artist IDs.

Ten preview records did not pass duplicate byte verification and were retained. Three other artwork records also remain. `scripts/staging-review-availability.ts` checks remaining delivery availability and records actionable review reasons; it does not assign unavailable files or silently replace current media.

Operator commands (staging only, dry run by default):

```sh
node --env-file=.env.migration.local --import tsx scripts/staging-archive-assigned-duplicates.ts --environment=staging --evidence=/private/tmp/duplicate-evidence.json
node --env-file=.env.migration.local --import tsx scripts/staging-archive-assigned-duplicates.ts --environment=staging --evidence=/private/tmp/duplicate-evidence.json --apply --confirm-archive-duplicates --include-audio --backup=/private/tmp/duplicate-backup-UNIQUE.json
node --env-file=.env.migration.local --import tsx scripts/staging-review-availability.ts --environment=staging --apply-diagnostics --report=/private/tmp/remaining-review.json
```

`--include-audio` is opt-in and requires owner approval. Private full-song verification never falls back to public delivery. An existing approved public preview URL may be checked only for preview assets; exact size and byte checks still apply. No audio is claimed auditioned. Repeated archival ignores already archived duplicate records. Operations are per-record transactional with private backups and audit events; partial successful batches remain valid if a later record fails.

Validation: 19 fixture-policy assertions, five catalog-reference assertions, 15 reconciliation assertions, application TypeScript, production build and pure policy TypeScript checks passed. Live staging byte checks and content/storage fingerprints were verified for each archival batch. Authenticated Media Review counts still require browser refresh; final backend unresolved count is 13, not 107. This is not a claim that all 107 received new primary assignments.
