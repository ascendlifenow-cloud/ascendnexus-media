# ANM-WEB-082 Public Media Delivery API

## Purpose

The public delivery layer serves only public-safe, synchronized content under `/api/public`. Admin records and seed records are treated as untrusted until mapped through public mappers that strip admin fields, reject private/signed URLs, and exclude full-song URLs.

## Public Routes

- `GET /api/public/health`
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
- `GET /api/public/search?q=...`
- `GET /api/public/browse`
- `GET /api/public/metadata?path=...`

Admin readiness:

- `GET /api/admin/public-delivery/health`

## Response Model

All public responses use:

```ts
{
  success: boolean;
  data: T;
  meta?: {
    pagination?: {
      page: number;
      pageSize: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
    };
  };
  warnings?: string[];
  errors?: string[];
}
```

## Filtering Rules

Public services exclude:

- Draft, archived, deleted, pending, and failed publication states
- Private or signed media URLs
- Admin-only media
- Full-song URLs
- Raw publication operations
- Internal audit, processing, upload, and storage details

Legacy seed records without explicit publication metadata are mapped as public-safe only when their existing public status and URL safety checks pass.

## Cache

`PublicContentCacheService` provides in-memory TTL caching when Redis is unavailable. Public endpoints emit `ETag` and `Cache-Control` headers. Publication completion, unpublish, and archive operations invalidate related public cache keys through `PublishedContentSynchronizationService`.

Default TTLs:

- Site: 15 minutes
- Homepage: 5 minutes
- Artists: 10 minutes
- Releases: 5 minutes
- Gallery: 10 minutes
- Metadata: 15 minutes
- Search: 30 seconds

## Frontend

`PublicMediaApiClient` calls `/api/public` and falls back to seed-backed development services when the public API base is unavailable and `VITE_PUBLIC_API_SEED_FALLBACK_ENABLED` is not explicitly disabled.

Public hooks live in `src/hooks/public`.

Existing public pages now use API-backed hooks while preserving loading, error, and empty states.

## Verification

Run:

```bash
npm run typecheck
npm run test:public-delivery
npm run test:media-publication
npm run build
```
