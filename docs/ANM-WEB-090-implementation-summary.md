# ANM-WEB-090 Implementation Summary

## Findings Addressed

- PRF-004: admin release routes now require backend authentication and permissions.
- PRF-005: release create/update/list/lifecycle operations use persisted repository records instead of frontend-only seed state.
- PRF-010: public release delivery sanitizes persisted records and filters by public artist state.
- PRF-014: release media remains private-first and public responses strip unsafe URLs.
- PRF-018: release publication integrates with storage promotion readiness for cover/audio-preview assets while preserving full-song privacy.
- PRF-021: added an automated admin release CRUD lifecycle smoke test.
- PRF-024: local production infrastructure gaps remain documented when strict production config is not present.

## Implemented

- Extended `ReleaseRepository` with admin/public lookup, slug uniqueness, status counts, artist counts, and soft-delete helpers.
- Added `ReleaseSlugService` for slug generation, reserved-route rejection, and uniqueness checks.
- Added `ReleaseValidationService` for required fields, artist validation, date validation, field limits, external links, media URL safety, and full-song privacy checks.
- Added `AdminReleaseService` for create, list, get, update, readiness, publish, republish, unpublish, archive, restore, soft delete, media lookup, and public/admin sanitization.
- Added admin release controller and route dispatcher.
- Registered admin release routes in the backend server.
- Added release-specific safe error support to media API error normalization.
- Updated public release service to use release public sanitization and to hide releases when the assigned artist is not public.
- Replaced the frontend admin release service with an API-backed implementation while retaining the old export name as a compatibility alias.
- Updated admin release hooks and lifecycle actions to call backend publish/unpublish/archive/restore endpoints.
- Added `test:admin-release-crud` smoke test covering artist setup, release create, duplicate slug rejection, update, readiness, publish, public visibility, full-song exclusion, unpublish hiding, archive, and restore.

## Verification

Executed locally on 2026-07-10:

- `npm run typecheck`: passed.
- `npm run test:admin-release-crud`: passed with elevated local server bind permission.
- `npm run test:public-delivery`: passed.
- `npm run test:media-processing`: passed.
- `npm run test:media-publication`: passed.
- `npm run storage:verify-full-song-privacy`: passed.
- `npm run build`: passed with existing Vite warnings for TanStack module directives and large chunks.
- `npm audit --omit=dev`: passed with 0 vulnerabilities.
- `npm run config:validate:production`: failed as intended in this local workspace because production MongoDB, Redis, persistent storage provider, public/admin URLs, strong auth secrets, email, and worker enablement are not configured.

## Release CRUD Smoke Result

The admin release smoke verified:

- Published test artist creation.
- Persistent release draft creation.
- Duplicate slug rejection.
- Patch/update persistence.
- Readiness calculation.
- Publish state transition.
- Published release visibility through public delivery.
- Public response excludes full-song/private media data.
- Unpublish hides public route.
- Archive transitions to archived.
- Restore returns to draft/non-public state.

## Security Verification

- Backend permissions protect admin release routes.
- Protected lifecycle fields cannot be directly patched.
- Artist assignment is validated.
- Reserved slugs are rejected.
- Public release responses are allowlisted.
- Full-song public fields are stripped and blocked.
- Releases assigned to non-public artists are excluded from public delivery.
- Full-song privacy verification still passes after release changes.

## Known Limitations

- This local workspace does not have production MongoDB, R2/CDN, Redis/BullMQ, FFmpeg/FFprobe, or deployed worker infrastructure configured. Live production verification remains blocked until staging credentials and services are available.
- The admin media picker and version-replacement UX rely on existing media-management components. Backend release lifecycle and public-safety paths are now production-safe.
- Audio preview playback was verified at public-data level, not through a browser E2E media playback test in staging.
- Full SEO validation, redirect handling, and richer release dependency controls remain future production hardening work.

## Remaining Blockers For ANM-WEB-091+

- Configure staging/production MongoDB, Redis, object storage, CDN, workers, auth secrets, email, and public/admin base URLs.
- Run release E2E against staging with real cover upload, audio-preview upload, private full-song upload, processing, promotion, public playback, unpublish, archive, restore, and republish.
- Add a browser-level public audio playback E2E once staging media/CDN is configured.
- Complete richer media version rollback controls for cover/audio/full-song replacement.
