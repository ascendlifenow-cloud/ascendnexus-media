# ANM-WEB-075 Upload Pipeline QA & Production Readiness Report

Date: July 10, 2026
Project: Ascend Nexus Media Web
Scope: Admin upload, storage, linking, publishing, CDN readiness, public asset safety, and public route regression QA.

## Summary

The Ascend Nexus Media Web upload pipeline is production-readiness staged for the current frontend/mock-storage architecture. The app builds successfully, public structural QA passes, upload and media services are modular, uploaded assets default to draft/admin-only states, and public display rules include fallbacks and blocking checks for draft, archived, deleted, admin-only, unassigned, unsafe, and full-song media.

No blocking code defects were found during this pass. The only file change for ANM-WEB-075 is this QA report.

## Commands Run

```bash
npm install
npm run typecheck
npm run qa:public
npm run build
lsof -nP -iTCP:5303 -sTCP:LISTEN
curl route checks against http://127.0.0.1:5303
npx tsx upload security probe
```

Results:

- `npm install`: passed, dependencies already up to date, `0` vulnerabilities reported.
- `npm run typecheck`: passed.
- `npm run qa:public`: passed with `Public QA structural checks passed.`
- `npm run build`: passed.
- Dev server: reachable on `*:5303` with PID `20934`.
- Build warnings: Vite reports ignored TanStack Query `"use client"` directives and one large output chunk. These are non-blocking known warnings.

## Routes Verified

Admin upload-related routes return the SPA shell:

- `/admin/media`
- `/admin/media/new`
- `/admin/media/:assetId/edit`
- `/admin/media/review`
- `/admin/releases/new`
- `/admin/releases/:releaseId/edit`
- `/admin/artists/new`
- `/admin/artists/:artistId/edit`
- `/admin/gallery/new`
- `/admin/gallery/:galleryItemId/edit`
- `/admin/settings`
- `/admin/audit`

Public routes return the SPA shell:

- `/`
- `/artists`
- `/artists/nova-rea`
- `/songs`
- `/songs/firefly-instructions`
- `/gallery`
- `/search`
- `/browse`
- `/contact`
- unknown public path, handled by the React branded 404 route.

## Upload Workflows Verified

Verified by code inspection and build/typecheck:

- Admin Media Library uses `AdminBatchUploadPanel` through `AdminMediaUploadManager`.
- Batch uploads support multi-file selection, file picker fallback, drag/drop, validation summary, queue rows, per-file progress, retry, cancel, clear completed, and result report.
- Release forms include cover art, audio preview, and full song upload workflows.
- Artist/gallery/media admin forms include media upload/linking readiness through shared admin media components and hooks.
- Uploaded media records default to draft/admin-only settings in upload hooks and batch upload service.
- Object URL cleanup exists through the existing upload preview hook layer.
- Audio preview UI is backwards compatible and does not autoplay.

## Validation & Security Checks

Verified by code inspection and a service-level probe:

- Validation runs before storage in `MediaAssetUploadService`.
- Security checks run before storage in both `MediaAssetUploadService` and `MediaStorageService`.
- Unsafe filenames are sanitized.
- Metadata and errors are sanitized.
- SVG and GIF are disabled by default.
- Full-song public upload targets are blocked by default.
- Storage paths are validated before provider upload.

Security probe results:

- `cover.jpg.exe`: blocked.
- `../cover.jpg`: blocked.
- `script.js`: blocked.
- `cover.svg`: blocked.
- `cover.jpg`: allowed for cover-art image target.

## Storage & Processing

Verified:

- Mock/default storage provider is configured through the storage registry.
- Upload responses normalize into `MediaStorageObject` and `MediaUploadResult`.
- Asset records are created after successful storage upload.
- Image processing extracts metadata and derivative readiness without making upload success depend on derivative generation.
- Audio processing records duration/output/waveform readiness where possible.
- Full-song public playback defaults to false.
- Storage archive/delete readiness exists, with hard delete disabled unless explicitly allowed by lifecycle policy.

## Linking, Replacement, Lifecycle

Verified:

- `MediaAssetLinkingService` supports artist, release, gallery, homepage, site config, SEO, and social metadata field updates.
- Compatibility validation blocks wrong media type/field combinations.
- Replacement creates a new media version, preserves previous versions, updates active version metadata, and blocks public field updates when a replacement is not public-ready.
- Rollback readiness exists and updates active links when configured.
- Lifecycle service checks dependencies before archive/delete, blocks unsafe deletion, and records audit events.

## Published Visibility & Publishing

Verified:

- `MediaAssetVisibilityService` blocks draft, archived, admin-only/private, unassigned, unsafe URL, non-public entity, and full-song playback exposure.
- Release publishing validates title, slug, artist, date, artist active state, linked media safety, and public mapping safety.
- Artist activation validates display name, slug, image safety, linked media safety, and public mapping safety.
- Public release output blocks full-song URL exposure.
- Missing cover art/profile image/audio preview fallbacks remain available.

## CDN & Public Asset Sync

Verified:

- CDN config/readiness models and `MediaCdnService` exist.
- CDN disabled fallback behavior is supported.
- CDN URL building, cache busting, responsive image source readiness, and invalidation readiness exist.
- `PublicAssetSyncVerificationService` is mounted in `/admin/settings` through `PublicAssetSyncReportPanel`.
- The direct Node/tsx execution of the full public sync service is blocked by Vite-managed PNG imports in the public-page graph. The Vite build succeeds, so this is a local command-runner limitation rather than an app bundle failure.

## Audit Readiness

Verified:

- Upload started/completed/failed audit events are recorded non-blockingly.
- Security upload blocks record audit events.
- Batch upload started/completed/error/retry/cancel events are recorded.
- Linking, replacement, lifecycle, publishing, and public sync services record audit events.
- Audit failures are not used as blockers in the upload path.

## Accessibility & Responsive Notes

Verified by component inspection:

- Upload controls include file-picker fallback; drag/drop is not the only workflow.
- Buttons are keyboard-accessible native buttons.
- Progress components use visible labels and percentage/state text.
- Error and warning messages are textual, not color-only.
- Batch rows use responsive grid layouts and stack on smaller screens.
- Upload actions use touch-friendly minimum heights.

## Known Limitations

- Real cloud storage is not connected; development uses mock/frontend-ready storage architecture.
- Backend derivative generation is readiness only.
- Backend audio waveform/transcoding is readiness only.
- Virus scanning is not configured yet; the security layer records scan readiness as `not_configured`.
- CDN invalidation is readiness only until provider APIs are connected.
- Signed URL playback is future-ready only.
- Public asset sync full-service execution is available in the app UI; direct `tsx -e` service execution is blocked by non-code asset imports.
- No dedicated `lint` script exists in `package.json`; `typecheck`, `qa:public`, and `build` were used as available project checks.

## Issues Found

No blocking code issues were found.

Non-blocking notes:

- Large production chunk warning should be addressed later with route/admin code splitting.
- Vite reports ignored TanStack Query `"use client"` directives from dependency modules; build completes successfully.
- Public asset sync would benefit from a dedicated script or test harness that registers Vite asset import handling.

## Fixes Applied

- Created this QA and production-readiness report.
- No source-code fixes were required.

## Production Readiness Notes

The upload/media pipeline is ready for continued staged development and demo use on the current mock-storage frontend architecture. Before real production launch, connect a backend storage provider, server-side derivative/audio processing, virus scanning, persistent audit storage, signed URL policy enforcement, CDN invalidation APIs, and a server/test-runner compatible public asset sync command.

## Recommended Next Prompts

- Backend storage provider adapter connection and environment secret handling.
- Server-side image/audio processing worker integration.
- Upload virus scanning provider integration.
- Public asset sync CLI/test harness.
- Admin media persistence/API replacement for in-memory service state.
- Production code-splitting and bundle-size hardening.
