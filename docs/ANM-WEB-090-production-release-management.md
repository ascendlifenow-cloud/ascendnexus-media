# ANM-WEB-090 Production Release Management

## Scope

ANM-WEB-090 completes the production release and song-management bridge for Ascend Nexus Media Web. Admin release operations now use authenticated backend routes, persistent release records, artist assignment validation, slug validation, lifecycle state transitions, readiness checks, audit events, public-delivery sanitization, and full-song privacy protections.

## Release Lifecycle

Release content status values:

- `draft`
- `published`
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

Public visibility is separate from content status. A release is public only when:

- `status = published`
- `publicationState = published`
- `publicVisibility = true`
- assigned artist is active, published, and public
- public mapper strips or omits unsafe/private media values

Restore returns the release to draft/non-public state and never republishes automatically.

## Backend API

Admin release routes are handled by `server/routes/adminReleaseRoutes.ts` and `server/controllers/adminReleaseController.ts`.

Supported routes:

- `GET /api/admin/releases`
- `POST /api/admin/releases`
- `GET /api/admin/releases/:releaseId`
- `PATCH /api/admin/releases/:releaseId`
- `DELETE /api/admin/releases/:releaseId`
- `GET|POST /api/admin/releases/:releaseId/validate`
- `GET /api/admin/releases/:releaseId/readiness`
- `GET /api/admin/releases/:releaseId/preview`
- `POST /api/admin/releases/:releaseId/publish`
- `POST /api/admin/releases/:releaseId/republish`
- `POST /api/admin/releases/:releaseId/unpublish`
- `POST /api/admin/releases/:releaseId/archive`
- `POST /api/admin/releases/:releaseId/restore`
- `GET /api/admin/releases/:releaseId/media`
- `GET /api/admin/releases/:releaseId/versions`
- `GET /api/admin/releases/:releaseId/dependencies`
- `GET /api/admin/releases/:releaseId/audit`
- `GET /api/admin/releases/:releaseId/processing`

All routes require backend authentication and permission checks. Frontend permission checks are presentation-only.

## Services

`AdminReleaseService` owns release business logic:

- Create release drafts.
- Validate artist assignment.
- Normalize and validate slugs.
- Reject duplicate and reserved slugs.
- Persist partial updates.
- Reject protected-field mass assignment.
- Mark published releases as republish-required when public-affecting fields change.
- Build readiness results.
- Publish, republish, unpublish, archive, restore, and soft-delete releases.
- Promote linked public-safe cover/audio-preview storage objects when available.
- Preserve private full-song fields by stripping public-facing full-song URLs.
- Record audit events.
- Invalidate public caches.
- Sanitize admin and public release payloads separately.

`ReleaseSlugService` owns slug generation, reserved-route checks, and uniqueness.

`ReleaseValidationService` owns required fields, release date validation, field limits, external links, media URL safety, artist readiness, and full-song privacy checks.

## Artist Assignment

Releases store only `artistId`. Artist names and public state are resolved from the artist repository.

Create/update rejects:

- missing artists
- deleted artists
- archived artists on update

Publication additionally requires the assigned artist to be active, published, and public. Public delivery also filters persisted releases by public artist IDs, so a release cannot remain visible through public release endpoints after its artist is unpublished or archived.

## Slug Policy

Slugs are lowercase, URL-safe, hyphen-separated, and unique.

Reserved slugs include:

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
- `latest`
- `featured`

Changing a published release marks it as needing republish. Redirect management remains a future SEO concern before frequent published slug changes are allowed operationally.

## Release Fields

Supported production fields include:

- title
- artist ID
- slug
- description
- lyrics
- release date
- genre
- style tags
- featured state
- featured placement
- sort order
- external links
- SEO/social metadata in safe metadata
- cover art URLs
- audio-preview URL
- private full-song references in metadata only

Full-song URL fields are removed from admin sanitizer output and never returned publicly.

## Media Workflows

Cover art and audio preview remain private/admin-only until publication. During release publication, linked storage object IDs in metadata are promoted when available:

- `coverArtStorageObjectId`
- `coverArtThumbnailStorageObjectId`
- `coverArtLargeStorageObjectId`
- `audioPreviewStorageObjectId`

Full-song metadata is never promoted publicly. Full-song master references belong in private metadata and storage/link records only.

## Readiness

Readiness checks include:

- release exists
- artist exists
- artist can support publication
- title present
- slug valid
- release date valid
- text and array limits pass
- external links use HTTPS
- public media URL fields are safe
- full-song public exposure is absent

Cover art, audio preview, and full-song master are currently warnings unless stricter product configuration marks them required.

## Publication Actions

Publish flow:

1. Authenticate and authorize `releases.publish`.
2. Load release.
3. Run readiness.
4. Promote optional cover/audio-preview storage objects where available.
5. Set `status = published`.
6. Set `publicationState = published`.
7. Set `publicVisibility = true`.
8. Clear `metadata.republishRequired`.
9. Record `release_published`.
10. Invalidate release, artist, homepage, search, and browse caches.

Unpublish:

- Requires `releases.unpublish`.
- Sets release to draft/non-public.
- Preserves media and audit history.
- Invalidates public caches.

Archive:

- Requires `releases.archive`.
- Sets status/publication state to archived.
- Removes public visibility immediately.
- Preserves assets and history.

Restore:

- Requires `releases.restore`.
- Restores to draft/non-public state.
- Requires review before republish.

Delete:

- Requires `releases.delete`.
- Uses soft delete by default.

## Public Delivery

Persisted public release delivery now:

- reads release repository records
- filters by public artist IDs
- returns only published/public releases
- strips private/unsafe media
- excludes full-song fields
- excludes admin metadata, processing IDs, upload IDs, and publication internals

Public release detail and list endpoints hide draft, archived, deleted, and artist-hidden releases.

## Frontend Integration

`src/services/admin/AdminReleaseService.ts` now calls backend release routes. The legacy `SeedBackedAdminReleaseService` export remains as a compatibility alias to the API-backed implementation.

Admin release hooks now publish, archive, unpublish, and restore through backend lifecycle endpoints. The admin release action component exposes real publish/unpublish/archive/restore actions instead of disabled lifecycle buttons.

## Security Notes

- Admin release routes are backend-protected.
- Protected fields such as `status`, `publicationState`, and `publicVisibility` cannot be patched directly.
- Artist assignment is validated backend-side.
- External links must use HTTPS.
- Full-song public fields are blocked/stripped.
- Public responses are allowlisted.
- Public delivery filters out releases whose artist is not public.

## Known Limitations

- Real live MongoDB, R2/CDN, Redis/BullMQ, FFmpeg/FFprobe, and deployed worker verification require staging/production configuration.
- Full media picker/replacement UX continues to rely on existing media components. Backend release media/readiness/publishing safety is in place.
- Audio waveform and transcode display depend on the existing processing subsystem and configured tools.
- Full SEO redirect handling for published slug changes remains part of the later SEO production pass.
