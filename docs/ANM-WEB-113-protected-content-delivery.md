# ANM-WEB-113 Protected Content Delivery

## Implemented

- Media access classifications and delivery profiles for protected audio stream and protected download.
- Protected media resources backed by private storage objects.
- Server-side stream and download authorization through the ANM-WEB-112 access evaluator.
- Hash-at-rest authorization tokens with short TTLs.
- Protected stream gateway with `HEAD`, `GET`, and single-range support.
- Protected download gateway with separate authorization and single-use policy readiness.
- Playback session records and member/resource revocation support.
- Takedown service for blocking resources and revoking authorizations.
- Protected delivery health service.
- Admin protected-content dashboard routes.
- Member protected media API clients and protected audio/download UI components.
- CLI verification suite.

## APIs

Member:

- `POST /api/member/media/:mediaId/stream-authorize`
- `GET /api/member/media/stream/:authorizationReference`
- `POST /api/member/media/:mediaId/download-authorize`
- `GET /api/member/media/download/:downloadReference`
- `POST /api/member/playback/sessions`
- `GET/PATCH/DELETE /api/member/playback/sessions/:playbackSessionId`

Admin:

- `GET /api/admin/protected-content/overview`
- `GET /api/admin/protected-content/health`
- `GET /api/admin/protected-content/assets`
- `GET /api/admin/protected-content/delivery-profiles`
- `GET /api/admin/protected-content/playback-sessions`
- `POST /api/admin/protected-content/takedown`
- `POST /api/admin/protected-content/restore`

## Client Behavior

`MemberProtectedAudioPlayer` requests authorization only on user action. It does not preload protected media. `ProtectedDownloadButton` requests a separate download authorization and does not reuse stream access.

## Safety Rules

- Protected URLs are short lived and never stored in public caches.
- Gateway responses use `private, no-store`.
- Storage paths and private object keys are never returned.
- Public APIs, metadata, and search scans must pass before launch.
- Download rights remain separate from stream rights.

## Verification

Use:

- `npm run protected-content:health`
- `npm run protected-content:authorization-test`
- `npm run protected-content:range-test`
- `npm run protected-content:download-test`
- `npm run protected-content:full-song-scan`
- `npm run protected-content:private-media-scan`
- `npm run protected-content:search-scan`
- `npm run protected-content:seo-scan`
- `npm run protected-content:analytics-scan`

## Known Limitations

Production CDN signed URL/cookie delivery, service-worker runtime inspection, browser E2E playback, mobile browser QA, and adaptive streaming are readiness items pending deployed infrastructure.
