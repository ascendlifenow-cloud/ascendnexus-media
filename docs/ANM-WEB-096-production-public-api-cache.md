# ANM-WEB-096 Production Public API, Projections And Cache

## Architecture Decision

Ascend Nexus Media Web uses a hybrid public delivery strategy:

- Artists, releases, gallery items, and metadata read activated published fields from the primary JSON-backed persistence layer through strict public services and repositories.
- Homepage and site configuration read the currently published configuration versions.
- Publication operations from ANM-WEB-095 invalidate public caches and write synchronization status.

This avoids a second conflicting projection store while keeping one public source of truth per endpoint.

## Public Safety

`PublicResponseSafetyService` scans every public response before it is sent. It blocks:

- private paths
- signed URLs and token/signature query strings
- raw storage paths
- full-song fields and references
- password/session/secret keys
- audit, upload, processing, and publication-lock internals
- Mongo `_id` style fields unless intentionally mapped away

Unsafe required responses return a normalized `PUBLIC_RESPONSE_SAFETY_VIOLATION` error and record an audit event.

## Public DTOs

Public DTO catalog lives in `server/types/public/PublicApiTypes.ts`. Public media references and audio previews intentionally omit storage provider, bucket, storage object, signed URL, processing records, and full-song relationships.

## Visibility

`PublicContentVisibilityService` defines the public rules:

- artists must be active, published, visible, and not archived/deleted
- releases must be published, visible, not archived/deleted, and linked to a public artist
- gallery items must be published, visible, not archived/deleted, and source-safe
- site/homepage versions must be published
- metadata must be published and public-safe
- media must be published with a public-safe URL

Unpublish and archive invalidations can also mark hidden-content tombstones.

## Public Routes

Primary endpoints:

- `GET /api/public/health`
- `GET /api/public/config`
- `GET /api/public/site`
- `GET /api/public/homepage`
- `GET /api/public/artists`
- `GET /api/public/artists/:artistSlug`
- `GET /api/public/artists/:artistSlug/releases`
- `GET /api/public/releases`
- `GET /api/public/releases/latest`
- `GET /api/public/releases/featured`
- `GET /api/public/releases/:songSlug`
- `GET /api/public/gallery`
- `GET /api/public/gallery/:galleryItemSlug`
- `GET /api/public/search`
- `GET /api/public/browse`
- `GET /api/public/metadata/path?path=/...`

Responses use the existing compatibility envelope with `success`, `data`, and `meta`, now including generated time and version metadata.

## Query Validation

Public queries reject:

- negative pages
- zero page size
- page size over 100
- unsupported sort fields
- `$`/dot/operator-style filter keys
- JSON-like query fragments
- invalid slugs
- oversized query strings

Allowed sort scopes:

- artists: `displayName`, `featured`, `newest`, `updated`, `sortOrder`
- releases: `releaseDate`, `title`, `featured`, `newest`, `sortOrder`
- gallery: `sortOrder`, `newest`, `title`, `featured`

## Cache

`PublicContentCacheService` provides safe local cache behavior for the current runtime:

- deterministic keys
- TTLs
- hit/miss/set/error metrics
- tag registration and tag invalidation
- entity invalidation
- hidden tombstones
- cache health and metrics

The current provider is `in_memory_fallback`. Production Redis wiring remains a deployment hardening item; when Redis is unavailable, the service safely falls back to authoritative public reads rather than seed/mock data.

## ETags And Headers

Public JSON responses include:

- stable ETags
- `Last-Modified` when supplied
- conditional `304` support for `If-None-Match` and `If-Modified-Since`
- public cache headers
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- safe public CORS preflight for public GET APIs

ETags ignore volatile `generatedAt` and `checkedAt` metadata.

## Public Synchronization

ANM-WEB-095 publication synchronization invalidates cache entries and records `PublishedContentSyncStatus`. Unpublish/archive actions add tombstones so a stale cache cannot resurrect hidden content.

## Client Integration

The frontend uses `PublicMediaApiClient` with `PublicApiClient` as a canonical alias. TanStack Query hooks under `src/hooks/public` use API data with bounded stale times. Seed fallback is development-only and disabled in production unless explicitly configured.

## Verification

`npm run public-api:verify` starts a local API server and checks:

- site/homepage/artists/releases/latest/gallery/metadata endpoints
- public safety scanning
- ETag and 304 behavior
- invalid page size rejection
- invalid sort rejection
- cache metrics
- absence of private, signed, storage, and full-song data

## Known Limitations

- Cache is currently in-memory for local/test. Redis-backed distributed cache remains environment-dependent.
- Cache warming and load testing commands use the same bounded verifier until staging infrastructure exists.
- Query explain-plan verification requires MongoDB/staging data.
- Full public browser E2E, CDN/API gateway verification, and staging Redis outage drills remain ANM-WEB-097+ work.
