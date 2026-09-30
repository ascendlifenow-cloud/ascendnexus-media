# ANM-WEB-095 Production Publication Workflow

## Architecture

ANM-WEB-095 centralizes production publication through `MediaPublicationOrchestrationService`. The service now wraps media assets, artists, releases, gallery items, homepage/site configuration, and metadata in the same durable operation model:

- `MediaPublicationOperation`
- `MediaPublicationStage`
- `MediaPublicationLock`
- `PublishedContentSyncStatus`

Publication work is started through `/api/admin/publication` or the entity-specific `/api/admin/publication/:entityType/:entityId/:action` routes. Existing artist, release, gallery, homepage, site-settings, and metadata services still own their domain-specific validation and record updates; the publication service now acts as the authoritative lifecycle wrapper that acquires locks, records stages, verifies public-safe output, invalidates cache, and records synchronization.

## Supported Entities

Supported entity types:

- `artist`
- `release`
- `gallery_item`
- `homepage`
- `site_config`
- `site_configuration`
- `metadata`
- `seo_metadata`
- `social_metadata`
- `media_asset`
- `standalone_media`

`homepage_section` and `custom` remain model-compatible for older admin UI surfaces, but launch publication should use the supported entity adapters above.

## Actions

Supported action types:

- `publish`
- `republish`
- `unpublish`
- `archive`
- `restore`
- `rollback`
- `activate`
- `sync_only`

`activate` and `republish` execute the same content publish path while retaining their distinct operation audit trail.

## Operation Flow

For content entities, the orchestrator performs:

1. Create or reuse an idempotent publication operation.
2. Acquire an entity lock.
3. Validate entity readiness for publish/republish.
4. Execute the domain service action.
5. Resolve the public representation.
6. Recursively verify that the public representation has no private paths, signed URLs, draft values, or full-song fields.
7. Invalidate public content caches.
8. Write a `PublishedContentSyncStatus`.
9. Verify public delivery for the entity type.
10. Mark the operation complete or blocked.
11. Release the lock.

For media assets, the existing media publication path promotes public-safe storage objects and keeps `full_song` assets private-only.

## Idempotency

Operations use this idempotency key:

```text
{entityType}:{entityId}:{actionType}:{targetVersion || current}
```

Administrators and scripts should pass `options.metadata.targetVersion` when publishing or republishing a new content version. Repeating the same request returns the existing active or completed operation instead of duplicating publication work.

## Locking

Only one active publication lock may exist per entity, regardless of action type. Expired locks are marked `expired` by stale recovery.

Operational endpoints:

- `GET /api/admin/publication/locks`
- `POST /api/admin/publication/recover-stale`

## Privacy Rules

The public representation verifier blocks:

- `private/` paths
- signed URL indicators
- token/signature query strings
- `blob:` URLs
- `fullSong`, `full-song`, and `full_song` fields
- signed/private key names such as `signedUrl` and `privatePath`

Admin service return values may contain private metadata for authorized admins. The publication privacy check verifies the public projection, not the internal admin payload.

## Readiness

Publish, republish, and activate run entity readiness checks:

- Artists use `AdminArtistService.getArtistReadiness`.
- Releases use `AdminReleaseService.getReleaseReadiness`, including full-song privacy state.
- Gallery uses `AdminGalleryService.getGalleryReadiness`.
- Homepage/site configuration uses `AdminSiteConfigurationService.getReadiness`.
- Metadata uses `AdminMetadataService.readiness`.
- Media assets use `MediaPublicationReadinessService`.

Unpublish, archive, restore, and rollback are allowed to proceed even when publish-readiness is not satisfied, so unsafe public content can be removed immediately.

## Public Synchronization

Publication completion calls `PublishedContentSynchronizationService`, which:

- invalidates public content cache keys for the entity
- records sync status
- tracks cache health
- records an audit event

The publication service then checks public delivery for artists, releases, gallery items, homepage/site configuration, and metadata where applicable.

## Admin API

New or finalized endpoints:

- `POST /api/admin/publication`
- `GET /api/admin/publication/health`
- `GET /api/admin/publication/locks`
- `POST /api/admin/publication/recover-stale`
- `GET /api/admin/publication/operations`
- `GET /api/admin/publication/operations/:operationId`
- `POST /api/admin/publication/operations/:operationId/retry`
- `POST /api/admin/publication/operations/:operationId/rollback`
- `POST /api/admin/publication/operations/:operationId/cancel`
- `GET /api/admin/publication/:entityType/:entityId/readiness`
- `POST /api/admin/publication/:entityType/:entityId/publish`
- `POST /api/admin/publication/:entityType/:entityId/republish`
- `POST /api/admin/publication/:entityType/:entityId/unpublish`
- `POST /api/admin/publication/:entityType/:entityId/archive`
- `POST /api/admin/publication/:entityType/:entityId/restore`
- `POST /api/admin/publication/:entityType/:entityId/rollback`

## CLI

Operational scripts:

- `npm run publication:health`
- `npm run publication:status`
- `npm run publication:verify`
- `npm run publication:recover-stale`
- `npm run publication:locks`
- `npm run publication:retry`
- `npm run publication:rollback`
- `npm run test:publication-workflow`

These currently run the same bounded workflow smoke in local/test mode. Dedicated non-mutating production CLIs should be split out when the deployment runtime is finalized.

## Known Limitations

- Publication execution is synchronous in the local API path. The durable operation model is ready for worker execution, but production queue handoff remains a deployment hardening item.
- Some content services still expose their legacy direct publish endpoints for frontend compatibility. New workflow work should use the central publication endpoint.
- Live CDN invalidation is represented through cache sync records in local smoke tests; production CDN credentials and verification remain environment-dependent.
- Full browser E2E, accessibility, and staging storage/CDN checks still need to run in a deployed test environment.
