# ANM-WEB-086 Migration Report

## Existing Models Found

- Auth models from ANM-WEB-085.
- Media asset, storage object, upload job, direct upload session, processing job, media link, media version, publication operation, publication lock, and audit event models.
- Public synchronization status model.

## Legacy Persistence Paths Found

- `server/services/media/JsonDatabase.ts` JSON persistence.
- Backend public artist/release services importing frontend seed data.
- Frontend admin content services still seed-backed for several domains.

## Migrations Created

- `0001-create-required-indexes`
- `0002-backfill-schema-version-and-timestamps`
- `0003-normalize-public-safety-fields`

These migrations are safe and idempotent. None are destructive.

## Indexes Created

Expected indexes are centralized in `server/database/collectionRegistry.ts` and cover auth, artists, releases, media, storage, links, versions, jobs, publication, gallery, homepage, site config, metadata, sync status, audit, contact, newsletter, email delivery, and migration collections.

## Compatibility Decisions

- Existing services continue through the `JsonDatabase` boundary.
- Production uses MongoDB when `MONGODB_URI` is configured.
- Development/test may keep JSON fallback.
- Public services prefer DB records and use seed fallback only when configured.

## Manual Review Flags

Legacy media assets with `assetType: "full_song"` are flagged with `requiresManualPublicSafetyReview` during safety normalization.

## Dry-Run and Execution

Use:

```bash
npm run db:migrate:dry-run
npm run db:migrate
npm run db:migrate:status
```

Live production migration execution was not performed in this local implementation pass because no production MongoDB URI was provided.

## Recovery Guidance

No destructive migrations were created. For production, take a provider-level backup before any future destructive migration and pass explicit backup acknowledgement only to migrations that require it.
