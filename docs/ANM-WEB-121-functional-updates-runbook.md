# ANM-WEB-121 Functional Updates Runbook

## Artist Overview Missing Releases

1. Confirm the artist status is `active`.
2. Confirm the release `artistId` matches the artist.
3. Confirm the release is not archived for the In Progress list.
4. Clear dashboard filters and reload `/admin`.

## Slug Generated Incorrectly

1. Edit the Title field.
2. If the slug was manually edited, click Regenerate to rebuild from title.
3. Confirm the slug is lowercase and hyphen-separated.
4. Save and reopen the release to verify persistence.

## Public Link Shows Song Not Found

1. Confirm the release is published.
2. Confirm the artist is public/active according to release visibility rules.
3. Try the public path by slug, song ID, and release ID.
4. If all fail, inspect the public release projection and publication status.

## Media Picker Does Not Show Asset

1. Confirm the media asset is not archived.
2. Confirm the asset type matches the field filter.
3. Confirm the asset has a usable public-safe URL for artwork/preview fields.
4. For full songs, confirm the asset is a `full_song` and remains protected.

## Verification Commands

- `npm run typecheck`
- `npm run build`
- Browser verification on the active LAN dev URL.
