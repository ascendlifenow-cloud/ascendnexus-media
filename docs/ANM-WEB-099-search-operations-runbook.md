# ANM-WEB-099 Search Operations Runbook

## Search Endpoint Failure

Run `npm run search:health`. Confirm `/api/public/search` returns a successful payload with `groups`, `results`, and pagination. If the endpoint fails, check public artist/release/gallery delivery health first because search depends on published projections.

## No Results For Known Published Content

Run `npm run search:verify`, then query the public entity endpoint directly. If the entity is not returned by `/api/public/artists`, `/api/public/releases`, or `/api/public/gallery`, fix publication or public projection sync before rebuilding discovery caches.

## Unsafe Query Rejection

Search and browse reject operator-like keys, oversized query strings, invalid entity types, and unsupported sort values. A 400 response is expected for unsafe keys such as `$where`, dotted keys, pipeline parameters, or JSON-like filter values.

## Private Media Exposure

Run `npm run search:safety-scan` and `npm run public-api:safety-scan`. Any full-song, signed URL, private path, storage path, or admin metadata exposure is critical. Remove the unsafe field from the public mapper or linked projection, then invalidate public caches.

## Stale Results

After publication, unpublish, archive, slug changes, or media replacement, invalidate public content caches through the publication workflow. Discovery cache keys include search, browse, suggestions, and related-release payloads.

## Genre Or Style Count Mismatch

Counts are derived from public artists and public releases. Confirm unpublished/draft content is not expected in counts. If public content is missing, check publication sync and public release/artist endpoints.

## Related Release Mismatch

Related releases are scored from same artist, same genre, and shared style tags. If results look sparse, inspect the source release metadata and make sure related releases are published under a public artist.

## Load Or Latency Incident

Reduce `pageSize`, enable upstream CDN/API caching, and verify public cache hit rates. Dedicated MongoDB explain-plan and load testing should be performed in staging before production launch.

## Recovery Verification

After remediation:

1. Run `npm run search:verify`.
2. Run `npm run public-api:verify`.
3. Open `/search` and `/browse` in the public client.
4. Confirm no draft, archived, private, or full-song content appears.
