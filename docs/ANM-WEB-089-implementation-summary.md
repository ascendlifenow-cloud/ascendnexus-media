# ANM-WEB-089 Implementation Summary

## Findings Addressed

- PRF-004: admin artist lifecycle routes now require backend authentication and permission checks.
- PRF-005: artist create/update/list/publication operations use persisted repository records instead of frontend-only mutation state.
- PRF-010: public artist delivery sanitizes persisted records and strips private/admin media fields.
- PRF-014: artist artwork publication is private-first and only public-safe URLs are exposed.
- PRF-018: artist publication integrates with storage promotion readiness and preserves optional artwork safety.
- PRF-021: added an automated admin artist CRUD lifecycle smoke test.
- PRF-024: production infrastructure gaps remain documented when strict production config is not present.

## Implemented

- Added `ArtistSlugService` for slug generation, normalization, reserved-route rejection, and uniqueness checks.
- Added `ArtistValidationService` for required fields, field sizes, genre/style limits, external links, linked media readiness, and safe URL checks.
- Added `AdminArtistService` for create, list, get, update, readiness, publish, unpublish, archive, restore, soft delete, media lookup, and public/admin sanitization.
- Extended `ArtistRepository` with admin and public lookup helpers.
- Added admin artist controller and route dispatcher.
- Registered admin artist routes in the backend server before media routes.
- Added artist-specific safe error support to media API error normalization.
- Added audit listing support for artist audit endpoint readiness.
- Updated public artist service to use the backend public artist sanitizer.
- Updated public artist mapper so optional missing profile artwork does not hide otherwise valid published artists.
- Replaced the frontend admin artist service with an API-backed implementation while retaining the old export name as a compatibility alias.
- Updated admin publish, archive, and restore mutations to call backend lifecycle endpoints.
- Enabled archive/restore artist actions in the admin UI.
- Added `test:admin-artist-crud` smoke test covering create, duplicate slug rejection, update, readiness, publish, public visibility, unpublish hiding, archive, and restore.

## Verification

Executed locally on 2026-07-10:

- `npm run typecheck`: passed.
- `npm run test:admin-artist-crud`: passed with elevated local server bind permission.
- `npm run test:public-delivery`: passed.
- `npm run test:media-processing`: passed.
- `npm run test:media-publication`: passed.
- `npm run storage:verify-full-song-privacy`: passed.
- `npm run build`: passed with existing Vite warnings for TanStack module directives and large chunks.
- `npm audit --omit=dev`: passed with 0 vulnerabilities.
- `npm run config:validate:production`: failed as intended in this local workspace because production MongoDB, Redis, persistent storage provider, public/admin URLs, strong auth secrets, email, and worker enablement are not configured.

## Artist CRUD Smoke Result

The admin artist smoke verified:

- Persistent draft artist creation.
- Duplicate slug rejection.
- Patch/update persistence.
- Readiness calculation.
- Publish state transition.
- Published artist visibility through public delivery.
- Unpublish hides public route.
- Archive transitions to archived.
- Restore returns to draft/non-public state.

## Security Verification

- Backend permissions protect admin artist routes.
- Protected fields such as `publicationState` and `publicVisibility` are not directly patchable.
- Reserved slugs are rejected.
- Public artist responses are allowlisted.
- Private/admin artwork URLs are stripped from public payloads.
- Unpublished and archived artists are hidden from public delivery.
- Full-song privacy verification still passes after artist changes.

## Known Limitations

- This local workspace does not have production MongoDB, R2/CDN, Redis/BullMQ, FFmpeg/FFprobe, or deployed worker infrastructure configured. Live production verification remains blocked until staging credentials and services are available.
- The frontend admin media picker and replacement controls rely on the existing media-management components. Backend artist media/readiness/publishing paths are now production-safe, but broader picker UX hardening remains tied to admin workflow follow-up work.
- SEO/social metadata is persisted and mapped safely through artist metadata. Full SEO validation and redirect handling remain part of the later SEO production pass.
- Release dependency policy for artist unpublish/archive is currently safe by public artist hiding and documented operational review. A richer cascade/block workflow should be completed with production release management.

## Remaining Blockers For ANM-WEB-090+

- Configure staging/production MongoDB, Redis, object storage, CDN, workers, auth secrets, email, and public/admin base URLs.
- Run the artist E2E workflow against staging with real artwork upload, processing, promotion, CDN retrieval, unpublish, archive, restore, and republish.
- Add release dependency cascade/block policy when production release CRUD is finalized.
- Add SEO redirect management before allowing frequent published slug changes.
