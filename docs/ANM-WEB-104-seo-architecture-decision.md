# ANM-WEB-104 SEO Architecture Decision

## Decision

Ascend Nexus Media Web uses the published public-delivery layer as the source of truth for SEO indexing. Sitemaps, robots.txt, canonical verification, structured-data checks, social-image safety checks, redirects, and indexing launch gates all resolve from the same public metadata and published content services used by visitors.

## Canonical Policy

Canonical URLs are generated from `PUBLIC_APP_BASE_URL` through the backend canonical URL service. Admin/API/private/preview/internal paths are never canonical. Tracking parameters are removed. Production indexing requires HTTPS and rejects local, staging, preview, and provider preview hosts.

## Indexability Policy

Indexable launch routes are the homepage, artist directory, published artist pages, release directory, published release pages, gallery directory, published gallery items, about, contact, privacy, and terms. Search, browse filters, 404, admin, API, preview, private, internal, newsletter confirmation, and unsubscribe paths are noindex or excluded.

## Sitemap Strategy

`/sitemap.xml` is a sitemap index. Scoped sitemaps are exposed at:

- `/sitemaps/pages.xml`
- `/sitemaps/artists.xml`
- `/sitemaps/releases.xml`
- `/sitemaps/gallery.xml`
- `/sitemaps/browse.xml`

Entries are included only when public metadata resolves, robots do not noindex the page, and the canonical URL is public-safe.

## Robots Strategy

Non-production environments emit `Disallow: /`. Production emits `Allow: /` plus explicit disallows for admin, API, private, preview, internal, login, health, and newsletter token paths. Robots always advertises the sitemap index.

## Launch Gate

The SEO indexing launch gate fails closed until ANM-WEB-103 production deployment is approved, production domain/TLS evidence exists, search-engine ownership is verified, live sitemap/robots are fetched, and rendered head checks pass.

## Known Limitation

This implementation provides deterministic local verification and production launch gating. It does not submit live sitemaps or validate Google/Bing ownership from this local workspace without real production credentials and deployed endpoints.
