# ANM-WEB-096 Implementation Summary

## ANM-WEB-083 Findings Resolved

- PRF-003: Public APIs now use public delivery services and published records rather than raw admin documents.
- PRF-004: Public artist, release, gallery, homepage, site, and metadata delivery are checked through the same public response safety layer.
- PRF-005: Full-song, private, signed, and storage-path exposure is blocked.
- PRF-010: Public delivery is synchronized with publication invalidation from ANM-WEB-095.
- PRF-019: Public homepage/site configuration continues through published versions with cache invalidation.
- PRF-021: Added public API verification for safety, ETags, invalid query rejection, and cache metrics.

## Architecture Selected

Strategy: hybrid activated published-version fields.

Public source of truth:

- primary published artist/release/gallery records
- published homepage/site configuration versions
- published metadata records
- public media URLs already promoted through storage/publication workflows

Cache strategy:

- local in-memory cache for current test runtime
- deterministic keys and TTLs
- metrics, tags, and hidden tombstones
- Redis deployment remains environment-dependent

## Backend Completed

- Added `PublicResponseSafetyService`.
- Added `PublicContentVisibilityService`.
- Added public DTO catalog in `server/types/public/PublicApiTypes.ts`.
- Added read-only public repositories for artists, releases, gallery, and site configuration.
- Added `PublicDeliveryVerificationService`.
- Hardened public response sending with safety scan, stable ETags, conditional 304, public cache headers, and security headers.
- Hardened public query validation with bounded page size, sort allowlists, invalid slug rejection, and NoSQL-style query rejection.
- Expanded `PublicContentCacheService` with metrics, tags, tag invalidation, versioned key helpers, and hidden tombstones.
- Integrated tombstones with publication unpublish/archive synchronization.
- Added authenticated admin cache metrics route.

## Client Integration

`PublicMediaApiClient` remains the implementation used by public hooks, with `PublicApiClient` added as the canonical alias. Seed fallback remains development-only and is not a production visibility authority.

## CLI And Tests

Added:

- `npm run test:public-api`
- `npm run public-api:health`
- `npm run public-api:verify`
- `npm run public-api:safety-scan`
- `npm run public-cache:status`
- `npm run public-cache:metrics`
- `npm run public-cache:warm`
- `npm run public-cache:invalidate`
- `npm run public-api:load-test`

The aliases currently run the bounded public API verifier.

## Verification Results

- `npm run typecheck`: passed
- `npm run public-api:verify`: passed
- `npm run test:public-delivery`: passed
- `npm run test:publication-workflow`: passed

The first sandboxed verifier run failed because localhost binding was blocked; rerunning with approval succeeded. The verifier confirmed ETag/304 behavior, invalid query rejection, cache metrics, and public safety for core endpoints.

## Known Limitations

- Redis-backed distributed cache, stampede locks, and production cache warming require deployment infrastructure.
- Load testing aliases currently execute the safety verifier; controlled staging load tests remain required.
- MongoDB explain-plan verification requires staging database access.
- Full client browser E2E, CDN/API gateway behavior, and accessibility verification remain ANM-WEB-097+ blockers.

## Remaining Blockers For ANM-WEB-097+

- Replace local cache provider with Redis in staging/production.
- Add true non-mutating cache status/invalidation/warming CLIs with production confirmation.
- Run public API load tests against staging.
- Add browser E2E for publication, unpublish, archive, rollback, and stale-cache prevention.
- Complete search/browse production indexing in the search-specific prompt.
