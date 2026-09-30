# ANM-WEB-086 Production Database Architecture

## Architecture

ANM-WEB-086 adds the MongoDB persistence foundation for Ascend Nexus Media Web using the official MongoDB Node driver. The project now has one production database runtime selected for persistence: `mongodb`.

The central ANM-WEB-084 config is the source of truth:

- `MONGODB_URI`
- `MONGODB_DATABASE`
- `DATABASE_AUTO_MIGRATE`
- Mongo connection timeout, selection timeout, pool size, retry writes, and health-check flags

Production and staging require `MONGODB_URI`. Local development and tests may use the legacy JSON fallback only when MongoDB is not configured.

## Persistence Boundary

Existing media/auth services use `server/services/media/JsonDatabase.ts`. That boundary now selects:

- MongoDB collections when `MONGODB_URI` is configured.
- Local JSON only for development/test fallback.

This keeps current service contracts stable while removing JSON-file dependence from production.

## Stable ID Strategy

MongoDB `_id` is internal. Public/admin application code uses stable IDs:

- `artistId`
- `releaseId`
- `assetId`
- `storageObjectId`
- `uploadJobId`
- `processingJobId`
- `publicationOperationId`
- `galleryItemId`
- `homepageConfigId`
- `siteConfigId`
- `seoMetadataId`
- `socialMetadataId`
- `contactSubmissionId`
- `subscriptionId`
- `userId`
- `sessionId`

## Schema Conventions

Primary records use:

- `createdAt`
- `updatedAt`
- `schemaVersion`
- optional `createdBy`
- optional `updatedBy`
- bounded `metadata`

Soft deletion is preferred through `status: "deleted"`, `deletedAt`, `deletedBy`, and optional `deleteReason`.

## Index Strategy

Indexes are centralized in `server/database/collectionRegistry.ts`. `DatabaseIndexService` can create and verify expected indexes without dropping unexpected production indexes.

Important index categories:

- Unique application IDs.
- Unique slugs and emails.
- Public query filters: status, publication state, public visibility, release date.
- Admin list filters: status, created/updated dates, owner/entity IDs.
- Operational queues: job status, retry dates, processing state.
- Audit and system records: created date, user/entity IDs.

## Migration Strategy

`DatabaseMigrationService` records migration state in `database_migrations`.

Current migrations:

1. `0001-create-required-indexes`
2. `0002-backfill-schema-version-and-timestamps`
3. `0003-normalize-public-safety-fields`

Production policy: run migrations as a deployment job before rollout. Application startup verifies required database readiness but does not run destructive migrations automatically.

## Public Query Safety

Public artist/release services now prefer persisted DB records and only use seed fallback when `PUBLIC_SEED_FALLBACK_ENABLED` allows it. Public queries require:

- public status
- published publication state
- public visibility
- public-safe URLs
- no full-song/private URL exposure

## Transactions

`withDatabaseTransaction` wraps MongoDB sessions where MongoDB is configured. Local JSON development fallback uses compensating explicit state updates instead.

Workflows that should use transactions as repositories are expanded:

- media asset plus storage object creation
- media version replacement
- publication state updates
- user disable plus session revocation
- homepage/site config version activation

## CLI Commands

- `npm run db:status`
- `npm run db:initialize`
- `npm run db:migrate`
- `npm run db:migrate:dry-run`
- `npm run db:migrate:status`
- `npm run db:indexes:check`
- `npm run db:integrity:check`
- `npm run db:seed:development`

`db:seed:development` refuses staging and production.

## Known Limitations

- Admin artist/release/gallery/homepage CRUD endpoints are still broader follow-up work under ANM-WEB-092.
- Redis queues, real processors, storage hardening, backups, and deployment manifests remain later launch prompts.
- Live MongoDB verification requires a configured `MONGODB_URI`; local checks run against the development JSON fallback.
