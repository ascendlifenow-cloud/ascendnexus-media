# ANM-WEB-093 Implementation Summary

## Findings Resolved

- PRF-010: Public homepage/site configuration no longer depends solely on hardcoded component data.
- PRF-011: Homepage ordering and visibility controls now persist through admin APIs instead of frontend-only state.
- PRF-015: Authenticated backend site-settings and homepage draft, readiness, publish, version, archive, and rollback routes now exist.
- PRF-019: Public homepage and site configuration APIs now read published configuration and strip unsafe draft/private data.

## Backend Completed

- Added published/draft/archived lifecycle support to homepage and site configuration models.
- Expanded `HomepageRepository` and `SiteConfigRepository` with draft, published, version-history, and single-published-version helpers.
- Added `HomepageSectionRegistry`, default configuration helpers, safe public mapping, and `SiteConfigurationValidationService`.
- Added `AdminSiteConfigurationService` for draft bootstrap, draft update, readiness, publication, archive, version history, and rollback.
- Added admin site/homepage controllers and routes.
- Registered the routes in the media API server.
- Updated public site and homepage delivery to use published persisted configuration.

## Frontend Completed

- Replaced the seed-backed admin site configuration service with `ApiBackedAdminSiteConfigService`.
- Added React Query hooks for site publication, readiness, and versions.
- Updated public homepage configuration loading to prefer `/api/public/homepage`.
- Enabled persisted homepage move up/down, toggle visibility, save layout, and publish actions.
- Updated Site Settings actions to save, publish, and reload persisted drafts.
- Removed the mock status label from homepage and settings admin headers.

## Section Registry And Ordering

Supported public section types are:

- `hero`
- `featured_release`
- `latest_releases`
- `artist_spotlight`
- `gallery_preview`
- `about`
- `explore_artists_cta`
- `custom`

Disabled sections are retained in drafts but omitted from public homepage payloads. Ordering is normalized on each persisted update.

## Publication And Rollback

Publication preserves the previous live version and activates exactly one published homepage/site version. Rollback reactivates a retained version and verifies that public `/api/public/site` reflects the restored content.

## Tests Run

- `npm run typecheck`: passed.
- `npm run test:admin-homepage-site`: passed after localhost binding escalation.
- `npm run test:public-delivery`: passed.
- `npm run build`: passed with existing Vite warnings about ignored `"use client"` directives in TanStack Query modules and a large `index` chunk.
- `npm run config:validate:production`: failed in this local environment because production infrastructure credentials/settings are not configured.

Smoke result:

```json
{
  "success": true,
  "disabledSectionHidden": true,
  "publicSafePayloads": true,
  "rollbackRestoredVersion": "run-specific first published version",
  "publicSiteRolledBack": true
}
```

## Verification Notes

The local smoke verifies draft bootstrap, draft updates, readiness, publish, public `/api/public/site`, public `/api/public/homepage`, disabled-section filtering, unsafe public payload checks, second-version publication, version history, and rollback.

Live staging verification remains required for real MongoDB persistence, Media Library hero/brand upload and processing, CDN delivery, browser preview, drag-and-drop polish, full responsive QA, accessibility tooling, and production cache/CDN behavior.

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

## Known Limitations

- Newsletter signup is still disabled unless a real backend is configured.
- Admin section-specific editors remain compatible with persisted config but still need richer field-level UX beyond the current form surfaces.
- Production configuration verification still requires staging credentials for MongoDB, storage/CDN, Redis/workers, and deployed public/admin base URLs.

## Remaining Blockers For ANM-WEB-094+

- Complete public route/content pages that are referenced by navigation and footer.
- Perform staging E2E with real brand/hero media uploads and CDN URL retrieval.
- Add dedicated accessibility/browser automation for the final launch QA pass.
