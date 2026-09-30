# ANM-WEB-126 Functional Readiness

## Passing Local Functional Areas

- Public site shell and public routes respond.
- Public API projection safety passes.
- Admin superadmin login passes.
- Admin Releases and Media Library APIs respond while authenticated.
- Member authentication lifecycle smoke passes.
- Publication workflow smoke passes.
- Storage health passes in local development mode.

## Areas Requiring External Verification

- Real email inbox delivery for registration verification, password reset, contact, and newsletter workflows.
- Browser E2E across admin artist, release, media review, media library, homepage, gallery, member portal, public playback, and artwork collage flows.
- Staging media intake watcher with `MEDIA_INTAKE_ENABLED=true`.
- Staging CDN/object-storage public promotion and protected-media isolation.
- Production domain/TLS/cache/service-worker verification.

## Local Data Recovery Note

During dev-stack restart, the normal `dev:lan` process read an empty `server/data/media-db.json`. The empty file was backed up as `server/data/media-db.empty-before-anm-web-126-2026-08-08T15-17-00Z.json`, and the latest valid local snapshot `server/data/media-db.pre-upload-purge-2026-07-13T01-15-27-741Z.json` was restored. Seed verification and superadmin login passed after restore.

## New Control

`ProductionLaunchBlockerService` now creates one server-authoritative report consumed by:

- Admin API: `GET /api/admin/launch-readiness`
- Admin page: `/admin/launch-readiness`
- CLI commands: `npm run launch:*`

The decision fails closed when P0/P1 blockers remain.
