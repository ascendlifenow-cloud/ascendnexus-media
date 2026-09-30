# ANM-WEB-087 Production Storage Verification

## Provider Decision

ProductionStorageProviderDecision:

- provider: `cloudflare_r2`
- adapter: `CloudflareR2StorageAdapter`, built on `S3CompatibleStorageAdapter`
- endpointType: S3-compatible R2 endpoint
- bucketStrategy: one configured backend bucket with generated prefixes
- publicDeliveryStrategy: `MEDIA_STORAGE_PUBLIC_BASE_URL` or CDN URL for public-prefix objects
- privateDeliveryStrategy: private/admin-only namespace plus signed URLs
- signedUrlSupport: yes, SigV4 presigned `GET`
- multipartSupport: yes, S3-compatible multipart session and part URLs
- copySupport: yes, S3-compatible copy object
- deleteSupport: yes, path resolved from database storage records
- versioningSupport: application-level media versions
- cdnStrategy: optional `MEDIA_CDN_BASE_URL`, versioned paths preferred
- reason: prior ANM-WEB-077 selected Cloudflare R2 and the project already has an S3-compatible adapter
- knownLimitations: live bucket verification requires real R2 credentials; CDN invalidation remains provider-readiness until a CDN API is configured

## Environment Variables

Required for production R2:

- `MEDIA_STORAGE_PROVIDER=r2`
- `MEDIA_STORAGE_ENDPOINT`
- `MEDIA_STORAGE_REGION=auto`
- `MEDIA_STORAGE_BUCKET`
- `MEDIA_STORAGE_ACCESS_KEY_ID`
- `MEDIA_STORAGE_SECRET_ACCESS_KEY`
- `MEDIA_STORAGE_PUBLIC_BASE_URL`
- `MEDIA_STORAGE_PUBLIC_PREFIX=public`
- `MEDIA_STORAGE_PRIVATE_PREFIX=private`
- `MEDIA_STORAGE_SIGNED_URL_EXPIRATION_SECONDS`
- `MEDIA_STORAGE_FORCE_PATH_STYLE=true`
- `MEDIA_STORAGE_ALLOW_PRODUCTION_MOCK_FALLBACK=false`

Optional CDN:

- `MEDIA_CDN_ENABLED=true`
- `MEDIA_CDN_PROVIDER`
- `MEDIA_CDN_BASE_URL`
- `MEDIA_CDN_IMAGE_BASE_URL`
- `MEDIA_CDN_AUDIO_BASE_URL`
- `MEDIA_CDN_CACHE_BUST_STRATEGY=versioned_path`

## Namespace Design

Public paths use the configured public prefix and entity-aware generated paths. Private, processing, quarantine, and direct-upload paths are generated only by the backend.

Full-song uploads always resolve to `admin_only` and never use the public prefix by default.

## Upload Flow

Backend upload flow:

1. Authenticate admin.
2. Authorize `media.upload`.
3. Validate upload target and file.
4. Force private-first access for draft uploads.
5. Generate backend storage path.
6. Upload through selected provider.
7. Persist storage object.
8. Persist media asset.
9. Create initial version.
10. Queue processing jobs.
11. Record audit events.

Direct multipart upload follows the ANM-WEB-078 session model with scoped part URLs and provider-side completion verification.

## Signed URL Flow

`POST /api/admin/media/storage/signed-url` accepts `assetId` or `storageObjectId`, `purpose`, and optional `expirationSeconds`.

Rules:

- Requires `media.generate_signed_url`.
- Resolves storage path from database records.
- Rejects arbitrary paths.
- Rejects archived/deleted objects.
- Rejects public objects that do not need signing.
- Does not persist or log signed URLs.
- Returns `no-store`.

## Public URL and CDN Flow

`MediaPublicUrlService` and `MediaCdnService` only return URLs for public storage records using public namespace paths. Full-song, draft/private, archived, deleted, and signed URL paths are excluded.

## Promotion and Demotion

Promotion is private-first:

1. Verify source storage record.
2. Build versioned public destination path.
3. Copy source object to public path where provider supports copy.
4. Create a new public storage object record.
5. Update the media asset public fields.
6. Preserve private source object.

Demotion hides public delivery through database state and clears public URLs. Physical deletion remains controlled by lifecycle and retention policy.

## Reconciliation and Health

`ProductionStorageHealthService` reports provider readiness, bucket access, multipart/copy/signed URL support, CDN readiness, mock fallback state, and database synchronization.

`MediaStorageReconciliationService` detects:

- missing provider objects
- private records with public URLs
- full-song public violations
- duplicate storage paths
- abandoned multipart uploads
- stale processing objects

## CLI

- `npm run storage:health`
- `npm run storage:reconcile`
- `npm run storage:verify -- --assetId=<assetId>`
- `npm run storage:verify-full-song-privacy`
- `npm run storage:test-provider`
- `npm run storage:test-cdn`

## Verification Notes

Local verification can prove path generation, config validation, signed URL generation, public/private filtering, and database reconciliation. Live R2 upload/read/copy/delete verification requires staging credentials and a staging bucket.

Latest local verification on 2026-07-10:

- Storage health passed against the local provider with mock fallback disabled.
- Full-song privacy verification passed with no public/CDN/signed-access violations.
- R2 provider smoke passed for configuration, namespace generation, public URL generation, private URL rejection, and SigV4 signed URL generation using synthetic non-secret values.
- CDN smoke passed with CDN disabled and versioned-path cache-bust readiness.
- Backend upload, direct upload, media publication, and public delivery smoke tests passed.
- Build and TypeScript checks passed.
- Production strict config correctly failed in this workspace because production secrets, persistent storage provider values, MongoDB, Redis, public base URLs, workers, and email are not configured.
- Reconciliation returned warnings for stale local smoke-test records and one duplicate test path; no full-song or private-public URL exposure violations were detected.

Live staging verification still requires real R2/CDN credentials and should cover upload, head/read metadata, copy promotion, delete probe, public retrieval, CDN retrieval, signed private retrieval, full-song exclusion from public APIs, and reconciliation against the staging bucket.
