# ANM-WEB-097 Public Client Operations Runbook

## Public Page Fails To Load

1. Run `npm run public-client:verify`.
2. Check `/api/public/health`.
3. Verify `/api/public/site` and `/api/public/homepage` return successful public envelopes.
4. Review recent publication operations and cache invalidation.

## Navigation Or Footer Is Wrong

1. Confirm the site configuration was published, not only saved as draft.
2. Fetch `/api/public/site`.
3. Check disabled links, sort order, unsafe internal routes, and external URL scheme.
4. Republish site settings if the public payload is stale.

## Homepage Content Is Missing

1. Check `/api/public/homepage`.
2. Confirm sections are enabled and supported by the public section registry.
3. Verify linked artists, releases, and gallery items are published.
4. Run public cache invalidation through the publication tools if stale data persists.

## Artist, Release, Or Gallery Detail 404

1. Confirm the entity is published and public-visible.
2. Confirm the slug has not changed without republishing.
3. Check tombstone/cache state after unpublish or archive.
4. Verify the public detail endpoint directly.

## Public Audio Preview Fails

1. Confirm the release public API response contains only `audioPreview`, never a full-song field.
2. Verify the audio preview asset is published and CDN-ready.
3. Check browser console/network errors for MIME type or CORS issues.
4. Re-run release publication if preview replacement is stale.

## Metadata Looks Stale

1. Fetch `/api/public/metadata?path=/target-path`.
2. Run `npm run metadata:verify`.
3. Confirm entity metadata was included in the latest publish/republish.
4. Invalidate metadata cache if the public API is serving an old version.

## Mobile Navigation Issue

1. Verify the route is present in `/api/public/site`.
2. Test keyboard focus, Escape close, route-change close, and outside-click close.
3. Confirm no admin/API route was added to public navigation.

## Legal Page Content Pending

Privacy and terms routes are production-routable but final legal text must be managed through approved content/legal workflow before launch signoff.

