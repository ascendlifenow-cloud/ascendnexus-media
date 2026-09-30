# ANM-WEB-104 SEO Operations Runbook

## Sitemap Missing URLs

Run `npm run seo:sitemap-verify -- --json`. Check that the entity is published, metadata resolves, robots does not noindex it, and the canonical URL is public-safe.

## Robots Blocks Production

Run `npm run seo:robots-verify -- --environment=production --json`. Production must not emit `Disallow: /`. Confirm the deployment environment and public base URL are correct.

## Canonical Domain Mismatch

Run `npm run seo:canonical-verify -- --target=/path --json`. Fix `PUBLIC_APP_BASE_URL`; do not derive canonical hosts from request headers.

## Private URL In Metadata Or Structured Data

Run `npm run seo:privacy-scan -- --json` and `npm run seo:structured-data-verify -- --target=/path --json`. Replace private, signed, draft, or full-song media with published public-safe media.

## Redirect Loop

Use `GET /api/admin/seo/redirects` or `npm run seo:redirects-verify -- --json`. Remove redirect chains and self-targeting redirects.

## Search-Engine Ownership Missing

Create the ownership verification in Google/Bing, then record only a safe reference in the backend verification record. Never store provider secrets in public metadata.

## Indexing Launch Blocked

Run `npm run seo:indexing-launch-gate -- --environment=production --json`. Resolve every blocking issue. Common blockers are ANM-WEB-103 launch gate failure, missing search-engine verification, non-production domain, or live rendered-head evidence not yet available.
