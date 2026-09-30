# ANM-WEB-091 Production Media Library

## Scope

ANM-WEB-091 completes the backend production Media Library operations needed to make uploaded assets durable, searchable, assignable, replaceable, rollback-ready, and inspectable from admin workflows.

The implementation builds on the existing upload, direct-upload, processing, storage, publication, artist, and release systems. It does not introduce a second media repository.

## Implemented Backend Operations

Media library operations are centralized in `MediaLibraryService`.

Supported capabilities:

- Persistent media listing with search and filters.
- Asset detail payloads with storage objects, links, and versions.
- Version history creation from existing storage objects.
- Asset replacement from a verified storage object.
- Previous version preservation.
- Rollback to an earlier version.
- Version archival readiness.
- Persistent media asset links.
- Detach link workflow.
- Dependency inspection.
- Safe delete readiness data.
- Full-song public replacement rejection.

## Admin API Routes

The media API now exposes:

- `GET /api/admin/media/assets?search=&assetType=&status=&ownerType=&ownerId=`
- `GET /api/admin/media/assets/:assetId`
- `GET /api/admin/media/assets/:assetId/versions`
- `POST /api/admin/media/assets/:assetId/replace`
- `POST /api/admin/media/assets/:assetId/versions/:versionId/rollback`
- `POST /api/admin/media/assets/:assetId/versions/:versionId/archive`
- `POST /api/admin/media/assets/:assetId/links`
- `POST /api/admin/media/links/:linkId/detach`
- `GET /api/admin/media/assets/:assetId/dependencies`

Existing upload, batch upload, direct upload, processing, storage health, reconciliation, signed URL, promotion, demotion, archive, restore, delete, and storage-object routes remain in the same admin media route file.

## Permissions

Routes require backend permissions:

- `media.read` for listing, details, versions, dependencies.
- `media.replace` for replacement and rollback.
- `media.link` for linking and detaching.
- `media.archive` for version archiving.
- Existing media upload/delete/edit/archive permissions remain enforced on existing routes.

Frontend controls remain UI affordances only; the backend is authoritative.

## Persistent Versioning

Versions are persisted through `mediaAssetVersions`.

When an asset has storage but no versions, the service creates an initial version from the linked storage object. Replacement creates a new active version and marks the previous active version as replaced. Rollback marks the selected version active and keeps newer versions rollback-ready.

Replacement from storage:

1. Load media asset.
2. Load storage object.
3. Validate storage object belongs to the asset or is unassigned.
4. Validate media compatibility.
5. Preserve previous active version.
6. Create new version.
7. Associate storage object with asset/version.
8. Update active version metadata.
9. Update public URL fields only when the storage object is public.
10. Record audit event.

## Linking And Assignment

Links are persisted through `mediaAssetLinks`.

Assignment rules:

- Archived and deleted assets cannot be newly assigned.
- Audio assets cannot be assigned to image fields.
- Full-song assets cannot be assigned as audio previews.
- Existing active link for the same entity/field is marked replaced.
- New active link is persisted.
- Asset assignment status and owner context update.
- Detach marks the link detached and updates asset assignment status when no active links remain.

## Full-Song Privacy

Full-song assets remain private by rule.

The backend rejects replacing a `full_song` asset with a public storage object. Public routes and storage privacy checks continue to verify that full-song media has no public URL, no public mapping, no CDN URL, and signed-access-only behavior.

## Dependency Inspection

Dependency payload includes:

- asset
- active links
- link history
- versions
- storage objects
- public reference status
- safe-delete readiness

Safe delete remains conservative. Linked or published assets are not treated as safe to physically delete.

## Storage Reconciliation

The existing storage reconciliation service remains the source of truth for missing object records, orphan records, duplicate paths, private-public URL violations, full-song violations, checksum mismatches, and abandoned uploads.

Local smoke runs may intentionally leave storage metadata pointing at non-existent local provider objects. These appear as reconciliation warnings and should be isolated or cleaned before staging verification.

## Security Notes

- Client-supplied storage paths are not accepted for replacement; replacement uses `storageObjectId`.
- Full-song public replacements are rejected.
- Private storage paths are not exposed as public URLs by replacement.
- Signed URLs are still generated through the signed URL service and are not persisted.
- Delete remains soft/conservative by default.
- Audit events are recorded without signed URLs or credentials.

## Known Limitations

- The browser-facing Media Library UI already has panels and controls, but this prompt focused on completing backend durable operations and smoke coverage.
- Real live provider replacement, CDN retrieval, and multipart large-file UX require staging credentials.
- Bulk-action UI and richer assignment-review queue UX remain future admin workflow hardening.
- Storage reconciliation warnings exist in this local workspace from accumulated smoke-test records.
