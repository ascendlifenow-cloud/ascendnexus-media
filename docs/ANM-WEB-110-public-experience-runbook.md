# ANM-WEB-110 Public Experience Runbook

## Landing Page Unavailable

1. Run `npm run public-experience:health`.
2. Check `/api/public/landing`.
3. Check `/api/public/site`, `/api/public/releases`, `/api/public/artists`, and `/api/public/gallery`.
4. If public delivery is unhealthy, run `npm run public-api:verify`.
5. If caches are stale, invalidate public delivery caches through the publication workflow.

## Private Data or Full-Song Scan Fails

1. Run `npm run public-experience:private-data-scan`.
2. Run `npm run public-experience:full-song-scan`.
3. Identify the reported payload path.
4. Remove the unsafe field from the public mapper or source projection.
5. Run the scans again before publishing.

## Guest Audio Preview Missing

1. Confirm the release is published.
2. Confirm the release has a public `audioPreviewUrl`.
3. Confirm full-song masters are not used as previews.
4. Run `npm run audio:public:verify`.
5. Republish the release if the public projection is stale.

## Public Account Links Broken

1. Confirm `/login` and `/register` render member identity pages.
2. Confirm the published navigation does not point to `/admin/login` for public members.
3. Run `npm run public-experience:network-scan`.

## Staging Verification

Before marking ANM-WEB-110 verified in staging:

- publish at least one artist
- publish at least one release with an audio preview
- publish at least one gallery item
- verify `/api/public/landing`
- verify browser rendering on desktop and mobile
- run public privacy and full-song scans
- run accessibility and performance checks
