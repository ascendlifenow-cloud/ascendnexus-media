# ANM-WEB-127 Content Readiness Operations Runbook

Generated: 2026-08-09T15:03:24.141Z

Decision: CONTENT READY

## Verification Commands
- `npm run launch:content-health`
- `npm run launch:artists-certify`
- `npm run launch:releases-certify`
- `npm run launch:media-certify`
- `npm run launch:media-binary-verify`
- `npm run launch:protected-media-verify`
- `npm run launch:public-routes-verify -- --base-url=<url>`

## Common Repairs
- Artist missing profile image: assign the intended ANMX profile image through Media Review or Artist edit, publish the artist, then rerun content certification.
- Release slug conflict: locate all non-deleted records with the slug, archive or rename stale drafts, then verify public route.
- Cover art missing or wrong: assign intended cover asset, promote to public, save and republish the release.
- Full song missing: assign a private full-song asset; never use a public preview URL as the full song.
- Full song exposed publicly: demote storage, clear public URL fields, revoke authorizations, rebuild projections, and run protected-media verification.
- Preview missing: generate or upload a dedicated preview asset; do not expose a full song and stop playback client-side.
- Media binary missing: restore from object-storage backup or remove the launch dependency through publication workflow.
- Public projection stale: rebuild the projection through publication services, invalidate targeted caches, and verify the route.
- Search or homepage stale: reindex or rebuild the affected launch records only, then verify no drafts/archived items leak.

## Rollback
Use the timestamped `server/data/media-db.before-*` snapshot referenced in the repair report for JSON rollback. Do not overwrite media binaries unless the affected storage object is identified and backed up.
