# Staging Media Library Reconciliation

This operator workflow covers legacy library uploads, separately from watched-folder intake. Files already ingested into storage are not uploaded again. It never deletes, archives, publishes, promotes storage, or replaces a content field.

## Decisions

- Repair an assignment only when exactly one live artist/release field already references that asset ID (or identical nonempty image/preview URL), with no conflicting active link. Restore the missing link and assigned status atomically. Existing public content is not changed.
- Name matches identify real catalog records, not fabricated slugs. A unique supported name match scores 0.96, above the 0.60 threshold, but remains a review suggestion until delivery validation. Confidence is a heuristic, not a probability.
- Occupied slots, ambiguous matches, conflicting links, and test-like names remain review items. Test files are retained; deletion requires a separately approved cleanup.
- Full-song URL equality cannot establish an association. Protected audio must have an explicit asset reference. No storage paths or URLs appear in reports or audit metadata.
- New assignments are deliberately not executed by this command. Existing assignment services can promote artwork, and use broad database writes in some persistence paths; automatic expansion must first harden those paths and validate delivery. A 60% match alone is insufficient to replace artwork or expose a private asset.

## Run

Use existing operator staging configuration, never commit credentials:

```sh
node --env-file=.env.migration.local --import tsx scripts/media-library-reconcile.ts --environment=staging --report=/private/tmp/media-library-plan.json
node --env-file=.env.migration.local --import tsx scripts/media-library-reconcile.ts --environment=staging --apply --confirm-staging --report=/private/tmp/media-library-result.json
node --import tsx scripts/media-library-reconciliation-test.ts
```

Production is rejected. Dry run is default. Each applied item rechecks current state within a MongoDB transaction, updates only the affected asset/link, and records an audit event. Concurrent changes stop the run rather than overwrite a target. Retry reports are idempotent for unchanged review decisions and do not recreate links. Successful earlier transactions remain if a later item fails; consult audit history before retrying.

The command compares pre/post content, storage, and media-delivery fingerprints; any change returns nonzero and requires investigation (including concurrent operator edits). Reports are JSON and saved with private permissions. Review metadata feeds the existing Media Review UI; resolved repairs disappear from pending review on refresh. Existing manual ignores remain respected.

## Initial Dry Run

136 records assessed: 135 unassigned and one detached. Found 39 test-like files, 75 occupied-slot matches, 19 unmatched items, one conflicting association, one unique new candidate, and one confirmed reference repair. Do not interpret this inventory as 135 missing songs or promise that all items can safely be auto-assigned.

## Executed Staging Result

User-authorized pass on 2026-10-27 (America/Denver): run `40d7b125-f54d-4727-bae6-7043a17b5815` repaired one existing artist profile association and prepared 135 review records. Independent verification confirmed the artist's explicit asset ID, matching existing URL, and exactly one active link. Final assignment counts: 437 assigned, 134 unassigned, one detached.

Repeat run `1a54703c-91b7-4aaf-a067-a39e9bb9e3f2` assessed the remaining 135, made zero changes, and skipped all 135 unchanged review decisions. Both runs confirmed identical content/storage/delivery safety fingerprints. Nothing was uploaded again, deleted, archived, promoted, or published. No actual new filename-based association was made; the only unique candidate still needs delivery validation and review.

Frontend review support was pushed in commit `1c4f391`; the staging bundle was fetched and confirmed to contain `libraryReconciliation`. API live health passed. Authenticated browser interaction was not tested in this run. Tests: 15 planner assertions, the existing intake threshold regression tests, application TypeScript check, production build, and standalone planner TypeScript check passed. The repository has no Node type definitions configured for an independent CLI TypeScript check; CLI execution was verified through real staging dry/apply/repeat runs instead.

Next bounded work: verify physical object availability and compare checksums for the 75 occupied-slot candidates before offering duplicate archival or replacement. Review the 39 test-like files before any destructive cleanup. Resolve the 19 unmatched names and the conflicting association with the owner; do not create speculative artist/release records.
