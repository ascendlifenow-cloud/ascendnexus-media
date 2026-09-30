# ANM-WEB-092 Implementation Summary

## Findings Resolved

- PRF-004: Gallery admin CRUD no longer depends on the frontend seed-backed gallery service.
- PRF-011: Gallery row/form placeholder lifecycle and ordering controls were replaced with real mutations.
- PRF-015: Authenticated backend gallery CRUD, readiness, lifecycle, reorder, media, versions, dependencies, audit, and delete-safety routes now exist.

## Backend Completed

- Added `AdminGalleryService` for create, list, detail, update, readiness, publish, republish, unpublish, archive, restore, soft delete, reorder, media, versions, dependencies, and serializers.
- Added `GallerySlugService` and `GalleryValidationService`.
- Expanded `GalleryRepository` with slug checks, admin/public queries, reorder, and status counts.
- Added `adminGalleryController` and `adminGalleryRoutes`.
- Registered `/api/admin/gallery` routes in the API server.
- Updated public gallery delivery to read persisted gallery records and enforce source visibility.

## Frontend Completed

- Replaced the seed-backed gallery service with `ApiBackedAdminGalleryService`.
- Updated admin hooks with publish, unpublish, restore, and reorder mutations.
- Enabled gallery list lifecycle actions.
- Added persisted order controls for save current order and keyboard move up/down.
- Removed duplicate mock publishing action buttons from the gallery edit page.
- Updated gallery upload mapping so signed URLs and raw storage paths are not persisted as gallery URLs.

## Tests Run

- `npm run typecheck`: passed.
- `npm run test:admin-gallery-crud`: passed after localhost binding escalation.
- `npm run test:admin-artist-crud`: passed as regression coverage.
- `npm run test:admin-release-crud`: passed as regression coverage.
- `npm run test:public-delivery`: passed.
- `npm run build`: passed with existing Vite warnings about ignored `"use client"` directives in TanStack Query modules and the large `index` chunk.
- `npm audit --omit=dev`: passed with 0 vulnerabilities.
- `npm run config:validate:production`: failed as expected in this local environment because production MongoDB, Redis, persistent storage/CDN, strong auth secrets, public/admin base URLs, workers, and email settings are not configured.

Smoke result:

```json
{
  "success": true,
  "publishedVisible": true,
  "unpublishedHidden": true,
  "restoredStatus": "draft",
  "privateMediaExcluded": true
}
```

## Verification Notes

The local smoke verifies backend persistence, duplicate slug rejection, update, readiness, publish, public API visibility, public private-field exclusion, reorder route, unpublish, archive, and restore.

Live staging verification is still required for real gallery image upload, image processing, public promotion/CDN URL resolution, responsive public rendering, browser accessibility checks, and full E2E workflow.

Strict production configuration blocker:

```text
STORAGE_PROVIDER_INVALID:MEDIA_STORAGE_PROVIDER
PUBLIC_API_BASE_URL_REQUIRED:PUBLIC_API_BASE_URL
PUBLIC_APP_BASE_URL_REQUIRED:PUBLIC_APP_BASE_URL
ADMIN_APP_BASE_URL_REQUIRED:ADMIN_APP_BASE_URL
DATABASE_URI_REQUIRED:MONGODB_URI
REDIS_URL_REQUIRED:REDIS_URL
AUTH_SECRET_WEAK:AUTH_SESSION_SECRET
AUTH_SECRET_WEAK:AUTH_ACCESS_TOKEN_SECRET
AUTH_SECRET_WEAK:AUTH_REFRESH_TOKEN_SECRET
STORAGE_PROVIDER_PERSISTENT_REQUIRED:MEDIA_STORAGE_PROVIDER
PUBLIC_MEDIA_URL_REQUIRED:MEDIA_STORAGE_PUBLIC_BASE_URL
DIRECT_UPLOAD_PROVIDER_UNSUPPORTED:MEDIA_DIRECT_UPLOAD_ENABLED
PUBLIC_CACHE_REDIS_REQUIRED:REDIS_URL
WORKERS_DISABLED_FORBIDDEN:MEDIA_WORKERS_ENABLED
CONTACT_EMAIL_REQUIRED:EMAIL_ENABLED
```

## Remaining Blockers For ANM-WEB-093+

- Production/staging infrastructure credentials are not configured in this local environment.
- Drag-and-drop ordering remains future UI polish; keyboard-accessible persisted ordering exists.
- Contact/newsletter workflows remain for ANM-WEB-093.
