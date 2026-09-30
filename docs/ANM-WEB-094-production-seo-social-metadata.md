# ANM-WEB-094 Production SEO, Social Metadata & Search Preview Management

## Architecture

Production metadata now uses backend records, public-safe resolution services, and public API delivery.

- Models: `SeoMetadataRecord`, `SocialMetadataRecord`
- Repository: `MetadataRepository`
- Admin service: `AdminMetadataService`
- Public delivery: `PublicMetadataDeliveryService`
- Route catalog: `PublicRouteMetadataCatalog`
- Canonical URLs: `CanonicalUrlService`
- Robots directives: `RobotsDirectiveService`
- Structured data: `StructuredDataService`
- Validation: `MetadataValidationService`
- Public client integration: `PublicPageMetadata`

## Entity Types

Supported metadata scopes include site, homepage, artist directory, artist, release directory, release, gallery, gallery item, search, browse, about, contact, privacy, terms, 404/not-found, and custom public pages.

## Inheritance

Metadata resolves in a deterministic order:

- Title: custom SEO title, entity title, route default, site default
- Description: custom SEO description, entity description, route default, site default
- Image: explicit social/SEO image, entity image, route fallback, site default social image

Empty values do not override usable defaults. Private, signed, blob/data, full-song, and tokenized URLs are rejected from public metadata.

## Canonical Policy

Canonical URLs are generated from the configured public app base URL. Local verification uses a safe fallback base when `PUBLIC_APP_BASE_URL` is absent. Admin/API/private paths, traversal, tracking parameters, hashes, unsafe schemes, and host mismatches are rejected.

Search and browse default to `noindex, follow` to avoid indexing duplicate query/filter combinations. Entity pages self-canonicalize to their slug routes.

## Robots Policy

Public indexable pages default to `index, follow, max-image-preview:large`. Search, browse, and 404 metadata default to `noindex`. Draft/admin/private pages remain noindex by policy and are not exposed by the public metadata endpoint.

## Social Metadata

Public metadata responses include Open Graph and X/Twitter Card fields:

- `og:title`
- `og:description`
- `og:type`
- `og:url`
- `og:site_name`
- `og:image` when public-safe
- `twitter:card`
- `twitter:title`
- `twitter:description`
- `twitter:image` when public-safe

Supported Open Graph types are `website`, `profile`, `music.song`, and `article`. Supported Twitter cards are `summary` and `summary_large_image`.

## Structured Data

JSON-LD is generated from trusted public fields:

- Homepage: `WebSite`, `Organization`
- Artist: `MusicGroup`
- Release: `MusicRecording`
- Gallery item: `ImageObject`
- Directories: `CollectionPage`

Structured data is sanitized before delivery. Raw scripts, functions, private URLs, signed URLs, full-song URLs, and secret fields are not emitted.

## Admin Workflow

The admin metadata UI now reads metadata through the backend API and overlays persisted records onto the existing metadata scan. Admins can scan, edit, refresh, and export metadata. Saves persist SEO/social overrides through authenticated metadata routes.

## Public API

`GET /api/public/metadata?path=/public-path` returns:

- title
- description
- canonicalUrl
- robots
- noIndex
- openGraph
- twitterCard
- structuredData
- metadataVersion
- lastModified

Public path validation rejects admin, API, private, and traversal paths without revealing draft content.

## Client Head Rendering

`PublicPageMetadata` fetches public metadata for the active route and renders one set of title, description, canonical, robots, Open Graph, Twitter Card, and JSON-LD tags. Existing static/generated page metadata remains the loading or API-failure fallback.

## Cache Invalidation

Metadata publication invalidates public metadata cache keys. Entity publication and site configuration publication already invalidate broad public content caches.

## Permissions

Admin metadata routes require:

- `metadata.read`
- `metadata.update`
- `metadata.publish`

## Known Limitations

Live staging still needs browser-rendered head verification, media-library social-image upload checks, CDN URL checks, and accessibility automation. Client-rendered metadata is the current implementation; ANM-WEB-104 should revisit prerender/server-rendered metadata for crawler completeness.
