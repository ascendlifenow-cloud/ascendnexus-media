# ANM-WEB-078 Direct Multipart Upload

## Overview

Ascend Nexus Media now has an additive direct-to-storage upload foundation for large media files. The existing backend-proxied upload remains available for small files, local/mock storage, and providers that cannot safely issue short-lived upload authorizations.

The frontend never receives permanent storage credentials. It only receives session-scoped, short-lived part upload URLs from the backend.

## Strategy Selection

The backend chooses the upload strategy for every session:

- `backend_proxy`: small files, local/mock storage, unsupported providers, or safe fallback.
- `multipart_presigned`: S3-compatible providers with configured credentials and multipart capability.
- `single_presigned`: reserved in the model for future providers that support single-object direct uploads.

Default direct upload threshold:

- `DIRECT_UPLOAD_MIN_FILE_SIZE_BYTES=26214400` (25 MB)

Full-song uploads always attempt direct upload when the provider supports it, but remain private/admin-only.

## Multipart Configuration

Server-controlled defaults:

- `DIRECT_UPLOAD_PART_SIZE_BYTES=10485760` (10 MB)
- `DIRECT_UPLOAD_MAX_PARTS=10000`
- `DIRECT_UPLOAD_SESSION_EXPIRATION_SECONDS=3600`
- `DIRECT_UPLOAD_MAX_RETRIES_PER_PART=3`
- `DIRECT_UPLOAD_PARALLEL_PARTS=3`

The backend may increase part size to avoid exceeding the maximum part count.

## Backend API

Authenticated admin routes:

- `POST /api/admin/media/direct-upload/sessions`
- `GET /api/admin/media/direct-upload/sessions`
- `GET /api/admin/media/direct-upload/sessions/:uploadSessionId`
- `POST /api/admin/media/direct-upload/sessions/:uploadSessionId/parts`
- `POST /api/admin/media/direct-upload/sessions/:uploadSessionId/parts/:partNumber/url`
- `POST /api/admin/media/direct-upload/sessions/:uploadSessionId/complete`
- `POST /api/admin/media/direct-upload/sessions/:uploadSessionId/cancel`
- `POST /api/admin/media/direct-upload/sessions/:uploadSessionId/retry`
- `POST /api/admin/media/direct-upload/sessions/:uploadSessionId/refresh`
- `POST /api/admin/media/direct-upload/cleanup`

All routes use the existing media admin authorization service and require media permissions.

## Session Lifecycle

1. Admin selects a file.
2. Frontend validates locally, then requests a backend session.
3. Backend validates target, file size, MIME, extension, access level, and provider support.
4. Backend generates the storage path and initializes multipart upload when available.
5. Frontend uploads file slices with controlled concurrency.
6. Frontend records completed part ETags.
7. Backend completes multipart upload, verifies object existence/size when available, creates storage and media asset records, and creates the initial media version.
8. Upload job and audit records are updated.

## Privacy Rules

Direct uploads are private by default. Full songs are forced to `admin_only` storage and are never returned as public URLs. Draft/unassigned media remains private/admin-only until the publishing workflow explicitly promotes it.

Presigned URLs are not stored as asset URLs and should not be logged.

## Pause, Resume, Retry, Cancel

Pause/resume readiness exists in the frontend hook and persistent session model:

- Pause stops scheduling new parts; active requests may finish.
- Resume refreshes backend authorization and continues pending work.
- Retry requests a fresh part URL and respects server retry limits.
- Cancel aborts multipart upload when the provider supports it and marks the session/job canceled.

Browser-refresh persistence is intentionally prepared by persisted session records, but the current frontend keeps the `File` reference only while the page remains active.

## Cleanup

`AbandonedUploadCleanupService` finds expired non-terminal sessions, aborts provider multipart uploads when supported, marks sessions expired, and records audit events. It is manually callable today and ready for an hourly/daily job runner later.

## Development Behavior

Local/mock storage providers return `backend_proxy`, preserving the previous upload behavior. This avoids pretending local storage has real presigned upload semantics.

## Troubleshooting

- If a direct session returns `backend_proxy`, check provider configuration and file size threshold.
- If completion fails with size mismatch, inspect provider HEAD metadata and ensure the final object matches the authorized session path.
- If part URL requests fail, refresh the session or retry the part.
- If full-song media appears public, treat it as a blocking configuration bug; full songs should be forced admin-only.
