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
