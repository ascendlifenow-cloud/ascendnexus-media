# ANM-WEB-077 Production Storage Setup

Date: July 10, 2026
Selected provider: Cloudflare R2

## Overview

The backend media API now supports Cloudflare R2 through a reusable S3-compatible storage adapter. AWS S3 can use the same base adapter. Local and mock storage remain available for development and automated smoke tests.

No provider credentials are exposed to the frontend, health endpoints, audit records, or docs.

## Backend Environment Variables

Required for Cloudflare R2:

```bash
MEDIA_STORAGE_PROVIDER=r2
MEDIA_STORAGE_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
MEDIA_STORAGE_REGION=auto
MEDIA_STORAGE_BUCKET=<bucket-name>
MEDIA_STORAGE_ACCESS_KEY_ID=<backend-only-access-key>
MEDIA_STORAGE_SECRET_ACCESS_KEY=<backend-only-secret-key>
MEDIA_STORAGE_PUBLIC_BASE_URL=https://media.example.com
MEDIA_STORAGE_PUBLIC_PREFIX=public
MEDIA_STORAGE_PRIVATE_PREFIX=private
MEDIA_STORAGE_FORCE_PATH_STYLE=true
MEDIA_STORAGE_SIGNED_URL_EXPIRATION_SECONDS=900
```

Optional CDN:

```bash
MEDIA_CDN_ENABLED=true
MEDIA_CDN_BASE_URL=https://cdn.example.com
```

Local API:

```bash
MEDIA_API_PORT=5313
MEDIA_API_HOST=127.0.0.1
MEDIA_ADMIN_DEV_TOKEN=dev-admin-token
```

Use `MEDIA_API_HOST=0.0.0.0` only when intentionally exposing the backend API on the local network.

## Frontend Configuration

Mock upload mode remains the default. To use the backend API from the admin app:

```bash
VITE_MEDIA_STORAGE_PROVIDER=custom
VITE_MEDIA_UPLOAD_API_BASE_URL=http://127.0.0.1:5313
VITE_MEDIA_ADMIN_DEV_TOKEN=dev-admin-token
```

The dev token is for local development only.

## Bucket Prefix Strategy

Public examples:

- `public/artists/{artistId}/profile/{file}`
- `public/artists/{artistId}/banner/{file}`
- `public/releases/{releaseId}/cover-art/{file}`
- `public/releases/{releaseId}/audio-preview/{file}`
- `public/gallery/{galleryItemId}/{file}`
- `public/site/logo/{file}`
- `public/site/social/{file}`

Private examples:

- `private/releases/{releaseId}/full-song/{file}`
- `private/media-library/unassigned/{assetType}/{file}`
- `private/admin-preview/{assetId}/{file}`
- `private/processing/{assetId}/{file}`

The backend chooses the namespace. Client-submitted paths are ignored.

## Public URL Behavior

Public URLs are returned only for paths inside the configured public prefix. Private paths never receive permanent public URLs.

When CDN is enabled, public URLs use `MEDIA_CDN_BASE_URL`. Otherwise, they use `MEDIA_STORAGE_PUBLIC_BASE_URL`.

## Signed URL Behavior

Private media access uses signed URLs through:

```text
GET /api/admin/media/storage/signed-url
```

Supported purposes include:

- `admin_preview`
- `private_audio_preview`
- `download`
- `processing`

Signed URL expiration is capped by backend config. Signed URLs are not persisted as permanent media URLs and are not written to audit logs.

## Full-Song Privacy

Full-song uploads are forced to `admin_only` by default, even if a client asks for public access. Public promotion of full-song storage objects is blocked unless a privileged backend call explicitly opts in.

## Cache Behavior

Defaults:

- Public versioned images: `public, max-age=31536000, immutable`
- Public audio previews: `public, max-age=86400`
- Private files: `private, no-store`

Draft and unassigned assets remain private by default.

## Health Checks

Backend endpoint:

```text
GET /api/admin/media/storage/health
```

The response includes provider readiness, bucket/public URL readiness, signed URL support, delete support, and config validation. It does not include endpoint secrets, access keys, secret keys, or raw provider authorization errors.

## Scripts

```bash
npm run dev:media-api
npm run dev:media-api:lan
npm run test:backend-media
npm run test:production-storage
```

`test:production-storage` uses mocked R2-style environment values and does not require live credentials.

## Troubleshooting

- If provider health says not configured, check missing fields from the health response.
- If public URLs are missing, confirm the object path starts with `MEDIA_STORAGE_PUBLIC_PREFIX`.
- If signed URLs fail, confirm R2 endpoint, bucket, access key, secret key, and expiration limits.
- If local development upload fails, keep `MEDIA_STORAGE_PROVIDER=local` or use frontend mock upload mode.
- If public media appears stale, configure CDN invalidation in a later provider-specific prompt.

## Current Implementation Notes

- The S3-compatible adapter uses Node built-ins for SigV4 signing to avoid adding network-installed dependencies in this environment.
- The adapter is operational for R2/S3-compatible `PUT`, `HEAD`, `DELETE`, public URL construction, and presigned `GET` URLs.
- Supabase and Firebase remain registered readiness stubs pending provider-specific SDK decisions.
