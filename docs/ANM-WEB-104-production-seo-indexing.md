# ANM-WEB-104 Production SEO Indexing

## Implemented Scope

ANM-WEB-104 adds production SEO indexing controls over the metadata system completed in ANM-WEB-094. It includes public robots.txt, sitemap index and scoped sitemaps, canonical path normalization, redirect records, slug-history persistence, search-engine verification records, structured-data safety scanning, admin SEO health endpoints, and CLI verification commands.

## Public Endpoints

- `GET /robots.txt`
- `GET /sitemap.xml`
- `GET /sitemaps/pages.xml`
- `GET /sitemaps/artists.xml`
- `GET /sitemaps/releases.xml`
- `GET /sitemaps/gallery.xml`
- `GET /sitemaps/browse.xml`

## Admin Endpoints

- `GET /api/admin/seo`
- `GET /api/admin/seo/health`
- `GET /api/admin/seo/routes?path=/...`
- `GET /api/admin/seo/sitemap`
- `GET /api/admin/seo/robots`
- `GET /api/admin/seo/redirects`
- `POST /api/admin/seo/redirects`
- `GET /api/admin/seo/search-engine-verification`
- `GET /api/admin/seo/indexing-launch-gate`

## CLI Commands

- `npm run seo:health`
- `npm run seo:verify`
- `npm run seo:metadata-verify`
- `npm run seo:canonical-verify`
- `npm run seo:sitemap-generate`
- `npm run seo:sitemap-verify`
- `npm run seo:robots-generate`
- `npm run seo:robots-verify`
- `npm run seo:structured-data-verify`
- `npm run seo:social-verify`
- `npm run seo:links-verify`
- `npm run seo:redirects-verify`
- `npm run seo:orphan-scan`
- `npm run seo:renderability-verify`
- `npm run seo:privacy-scan`
- `npm run seo:search-engine-verify`
- `npm run seo:indexing-launch-gate`

## Safety Rules

Sitemaps only include published public content with public metadata and indexable robots directives. Structured data is scanned for private paths, signed URLs, full-song references, admin/API paths, local hosts, and staging hosts. Production launch is blocked without deployment approval and search-engine ownership verification.

## ANM-WEB-104 Handoff

ANM-WEB-104 is complete as an application implementation. Verification remains pending for live production DNS/TLS, search-engine ownership, live crawler fetches, rendered head evidence, and final submission.
