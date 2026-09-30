# ANM-WEB-094 Metadata Operations Runbook

## Missing Title Or Description

Open the metadata editor, review the inheritance preview, and add explicit SEO/social overrides only when the generated entity or route default is insufficient. Re-run metadata validation before publication.

## Invalid Canonical

Canonical URLs must resolve to the configured public app origin. Remove tracking parameters, fragments, unsafe schemes, admin/API/private paths, and internal hosts.

## Wrong Production Domain

Verify `PUBLIC_APP_BASE_URL`. Do not rely on request headers for canonical generation. Republish metadata after correcting the environment value.

## Private Social Image

Replace the image with a public-safe Media Library asset or a published fallback. URLs containing private paths, signed parameters, tokens, blob/data schemes, or full-song references are blocked.

## Processing Pending

Wait for social derivative processing or select a verified compatible public image. Do not publish metadata that requires a derivative which has not been generated.

## Incorrect Fallback

Check site defaults from Site Settings and the entity primary media. Fallback resolution should be visible in preview and must remain public-safe.

## Duplicate Tags

Use `npm run metadata:verify` and browser head inspection. The public metadata component upserts one canonical, description, robots, Open Graph, Twitter Card, and JSON-LD script set.

## Missing Open Graph Image

Confirm a public-safe image exists through explicit metadata, entity image, route fallback, or site default social image. Missing images are allowed only when policy treats them as warnings.

## Invalid JSON-LD

Remove raw custom JSON-LD and rely on generated schemas from trusted public fields. Validate that no private URLs or full-song fields appear.

## Stale Metadata Cache

Republish metadata or invalidate public metadata cache keys. Confirm `/api/public/metadata?path=...` returns the expected version.

## Slug Change

Republish entity metadata after slug changes. Canonical paths must follow the new slug and old paths should be handled by redirect readiness in ANM-WEB-104.

## Public Sync Mismatch

Compare admin readiness, public metadata API output, and rendered page head tags. If API output is correct but rendered tags are stale, inspect client route transitions and metadata query cache.

## Client Rendering Issue

Client-rendered metadata depends on route hydration. If crawler-visible metadata is required for a route, move that route into ANM-WEB-104 prerender/server-rendering validation.

## Rollback Guidance

Archive bad metadata and republish the last known-good record for the same entity/path. Public metadata cache invalidates on publish/archive.
