# ANM-WEB-089 Production Artist Management

## Scope

ANM-WEB-089 completes the production artist-management path for Ascend Nexus Media Web. Admin artist actions now flow through authenticated backend routes, persistent artist records, slug validation, media-aware readiness checks, publication lifecycle methods, audit events, and public-delivery sanitization.

This implementation replaces the remaining seed-backed admin artist service behavior with API-backed artist operations while preserving compatibility for existing imports.

## Artist Lifecycle

Artist content status values:

- `draft`
- `active`
- `archived`
- `deleted`

Publication state values:

- `draft`
- `processing`
- `ready_to_publish`
- `publishing`
- `published`
- `publish_failed`
- `unpublishing`
- `archived`

Public visibility is controlled separately from content status. An artist is public only when the persisted record is active, publication state is published, public visibility is true, and public mapping sanitization succeeds.

Restore never republishes automatically. Restored artists return to draft/non-public state and must be reviewed before republishing.

## Backend API

Admin artist routes are handled by `server/routes/adminArtistRoutes.ts` and `server/controllers/adminArtistController.ts`.

Supported routes:

- `GET /api/admin/artists`
- `POST /api/admin/artists`
- `GET /api/admin/artists/:artistId`
- `PATCH /api/admin/artists/:artistId`
- `DELETE /api/admin/artists/:artistId`
- `GET|POST /api/admin/artists/:artistId/validate`
- `GET /api/admin/artists/:artistId/readiness`
- `GET /api/admin/artists/:artistId/preview`
- `POST /api/admin/artists/:artistId/publish`
- `POST /api/admin/artists/:artistId/unpublish`
- `POST /api/admin/artists/:artistId/archive`
- `POST /api/admin/artists/:artistId/restore`
- `POST /api/admin/artists/:artistId/republish`
- `GET /api/admin/artists/:artistId/media`
- `GET /api/admin/artists/:artistId/versions`
- `GET /api/admin/artists/:artistId/audit`
- `GET /api/admin/artists/:artistId/processing`

All routes require backend authentication and permission checks through `MediaAuthorizationService`. Frontend checks are only UI affordances.

## Services

`AdminArtistService` owns artist business logic:

- Create drafts with generated stable `artistId`.
- Normalize and validate slugs.
- Reject duplicate or reserved slugs.
- Persist partial updates through the repository.
- Reject protected-field mass assignment.
- Mark published artists as republish-required when public-affecting fields change.
- Build readiness results.
- Publish, republish, unpublish, archive, restore, and soft-delete artists.
- Record audit events.
- Invalidate public artist, homepage, browse, and search caches.
- Sanitize admin and public artist payloads separately.

`ArtistSlugService` owns slug generation, normalization, reserved-route validation, and uniqueness checks.

`ArtistValidationService` owns required fields, field limits, genre/style limits, external links, URL safety, and linked-media processing readiness.

## Slug Policy

Slugs are lowercase, URL-safe, hyphen-separated, and unique. Reserved slugs include:

- `admin`
- `api`
- `artists`
- `songs`
- `gallery`
- `search`
- `browse`
- `contact`
- `about`
- `privacy`
- `terms`

Changing a published artist marks the artist as needing republish. Redirect management is still a future SEO concern and should be handled before allowing casual public slug changes in production operations.

## Artwork Roles

Supported artist media roles:

- Profile image
- Character art
- Banner image
- Thumbnail image
- Social image

Authoritative media relationships continue to use media asset/storage records and metadata IDs. Public URL fields are written only when the value is public-safe.

Profile image is currently a publication warning rather than a blocking requirement. Character art and banner art are optional unless product policy later marks them required for a particular public presentation.

## Artwork Publication

Artwork remains private/admin-only until publication. During artist publication, linked storage object IDs in artist metadata are promoted through `MediaStoragePromotionService` when available:

- `profileImageStorageObjectId`
- `profileThumbnailStorageObjectId`
- `profileBannerStorageObjectId`
- `characterArtStorageObjectId`

Promotion failures for optional artwork do not publish private URLs and do not overwrite an existing public-safe value. The public artist mapper strips private, admin-only, and storage-path-like URLs.

## Processing Readiness

Artist processing summaries are read from persisted media processing jobs for linked artist asset IDs:

- `profileImageAssetId`
- `characterArtAssetId`
- `profileBannerAssetId`

Readiness warns when required processing is queued, active, or failed. Planned outputs are not treated as ready.

## Preview

`GET /api/admin/artists/:artistId/preview` returns a protected draft preview payload and sets:

`X-Robots-Tag: noindex, nofollow`

Public mapping preview behavior is represented through sanitized public output and public delivery smoke tests. Admin preview must not be exposed as a public route.

## Publication Actions

Publish flow:

1. Authenticate and authorize `artists.publish`.
2. Load persisted artist.
3. Run readiness validation.
4. Promote linked public-safe artwork where possible.
5. Set `status = active`.
6. Set `publicationState = published`.
7. Set `publicVisibility = true`.
8. Clear `metadata.republishRequired`.
9. Record `artist_published`.
10. Invalidate public content caches.

Unpublish flow:

- Requires `artists.unpublish`.
- Sets the artist to draft/non-public.
- Preserves media, versions, audit history, and editability.
- Invalidates public caches.

Archive flow:

- Requires `artists.archive`.
- Sets status and publication state to archived.
- Removes public visibility immediately.
- Preserves media and versions.

Restore flow:

- Requires `artists.restore`.
- Restores to draft/non-public state.
- Revalidates through normal readiness before any future publication.

Delete flow:

- Requires `artists.delete`.
- Uses soft delete by default.
- Hard delete remains outside normal workflow.

## Public Delivery

Public artist services now use backend public sanitization before returning persisted artists. Public responses include only safe artist fields and public-safe artwork URLs.

Public artist responses exclude:

- Admin audit data
- Processing internals
- Storage object IDs
- Private storage paths
- Draft-only metadata
- Unpublished private artwork

The public mapper now allows a published artist without optional profile artwork by returning an empty fallback image value instead of hiding the artist.

## Frontend Integration

`src/services/admin/AdminArtistService.ts` now uses backend API routes. The old `SeedBackedAdminArtistService` export remains as a compatibility alias to the API-backed implementation.

Admin artist mutations in `useAdminContent` call backend lifecycle endpoints. The artist action component now enables archive and restore actions through real mutations.

The admin artist form page reports a ready implementation status rather than mock status.

## Error Handling

Artist errors are normalized through safe media API errors, including:

- `ARTIST_NOT_FOUND`
- `ARTIST_SLUG_CONFLICT`
- `ARTIST_VALIDATION_FAILED`
- `ARTIST_PUBLICATION_BLOCKED`

Raw database/provider errors are not returned directly to the client.

## Security Notes

- Admin artist routes are backend-protected.
- Protected lifecycle/publication fields cannot be patched directly.
- Slugs and external links are sanitized.
- Public artist payloads are generated from explicit allowlists.
- Private artwork URLs are stripped from public responses.
- Draft/unpublished/archived artists are not public.
- Audit snapshots are recorded through the existing audit persistence service.

## Known Limitations

- Real live MongoDB, R2/CDN, Redis/BullMQ, FFmpeg/FFprobe, and deployed worker verification require staging/production configuration.
- Media Library picker UX remains tied to existing admin media components; this prompt completed backend-safe artist linkage/readiness surfaces rather than rebuilding the entire picker.
- SEO/social metadata persists in artist metadata and is mapped safely, but full SEO validation remains part of the later SEO production pass.
- Published release dependency policy is conservative at public-delivery level: once an artist is unpublished or archived, public artist lookups hide it. Full cascade controls for dependent releases remain a future workflow hardening item.
