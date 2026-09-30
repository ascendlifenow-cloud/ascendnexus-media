# ANM-WEB-076 Backend Media Upload API

Date: July 10, 2026

## What Was Added

ANM-WEB-076 adds a backend-managed media upload foundation under `server/`:

- Admin media upload routes under `/api/admin/media/*`
- Multipart upload parsing and structured safe errors
- Backend validation for targets, filenames, size, MIME/extension compatibility, full-song privacy, and file signatures
- Persistent JSON-backed records for media assets, storage objects, upload jobs, processing jobs, links, versions, and audit events
- Local/mock storage provider support with safe path generation and checksum storage
- Provider readiness stubs for S3, Cloudflare R2, Supabase Storage, and Firebase Storage
- Signed URL readiness endpoint
- Upload job polling, retry readiness, cancel readiness, archive/restore/delete status endpoints
- Frontend custom API upload integration while preserving mock upload mode

## Scripts

```bash
npm run dev:media-api
npm run dev:media-api:lan
npm run test:backend-media
```

The test script starts the API in-process, uploads a small PNG, verifies media asset/storage/upload job persistence, checks job polling, checks storage health, and closes the server cleanly.

## Environment Readiness

Supported backend environment variables:

- `MEDIA_API_PORT`
- `MEDIA_API_HOST`
- `MEDIA_ADMIN_DEV_TOKEN`
- `MEDIA_STORAGE_PROVIDER`
- `MEDIA_STORAGE_BUCKET`
- `MEDIA_STORAGE_REGION`
- `MEDIA_STORAGE_PUBLIC_BASE_URL`
- `MEDIA_STORAGE_PRIVATE_PREFIX`
- `MEDIA_STORAGE_PUBLIC_PREFIX`
- `MEDIA_STORAGE_LOCAL_ROOT`
- `MEDIA_DATA_ROOT`
- `MEDIA_UPLOAD_MAX_IMAGE_BYTES`
- `MEDIA_UPLOAD_MAX_AUDIO_PREVIEW_BYTES`
- `MEDIA_UPLOAD_MAX_FULL_SONG_BYTES`
- `MEDIA_SIGNED_URL_EXPIRATION_SECONDS`

Frontend custom API mode uses:

- `VITE_MEDIA_STORAGE_PROVIDER=custom`
- `VITE_MEDIA_UPLOAD_API_BASE_URL=http://127.0.0.1:5313`
- `VITE_MEDIA_ADMIN_DEV_TOKEN=dev-admin-token` for local development only

## Current Limitations

- MongoDB/Mongoose models are represented by TypeScript model files and JSON persistence for this prompt. The service boundaries are ready for MongoDB replacement.
- Multipart parsing is dependency-free and suitable for this foundation; production should replace or harden it with a mature streaming parser such as Busboy or Multer.
- Cloud provider adapters are registered as readiness stubs until credentials and provider SDK decisions are finalized.
- Image/audio processing jobs are model-ready but not yet backed by worker processing.
- Signed URLs are readiness placeholders for local storage, not provider-backed signed URLs.
- Runtime data under `server/data/*.json` and `server/uploads/media/**` is intentionally ignored.
