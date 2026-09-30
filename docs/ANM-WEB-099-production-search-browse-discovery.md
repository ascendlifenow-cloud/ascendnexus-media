# ANM-WEB-099 Production Search, Browse & Discovery

## Architecture

Public discovery now runs through the public delivery boundary rather than frontend-only filtering or seed-only search helpers. The API reads the already-sanitized published artist, release, and gallery projections, applies bounded query validation, ranks and filters results server-side, caches safe responses, and returns payloads that are scanned by the public response safety checks.

Resolved audit finding: PRF-022.

## Endpoints

- `GET /api/public/search`
- `GET /api/public/search/suggestions`
- `GET /api/public/browse`
- `GET /api/public/discovery/related/releases/:releaseSlugOrId`

Search supports `q`, `type`, `types`, `page`, `pageSize`, `sort`, `genre`, `styleTag`, `artist`, `releaseYear`, `featured`, and `hasPreview`. Browse supports `mode`, `genre`, `styleTag`, `artist`, `releaseYear`, `featured`, `mediaType`, `sort`, `page`, and `pageSize`.

## Entity Types

- `artist`
- `release`
- `gallery_item`

The legacy aliases `song`, `songs`, `release`, `releases`, and `gallery` are normalized for compatibility.

## Ranking

Search uses a deterministic weighted matcher over public-safe fields:

- Exact title/name matches receive the highest weight.
- Prefix matches rank above substring matches.
- Artist names, release titles, slugs, genres, style tags, bios/descriptions, and gallery captions are weighted by field importance.
- Sort modes can override ranking with newest, oldest, title, or featured ordering.

The implementation avoids regex-based user queries and does not execute database operators from request parameters.

## Browse Modes

- `all`
- `artists`
- `releases`
- `genres`
- `styles`
- `featured`
- `latest`
- `gallery`

Genre and style catalogs are derived from currently public artists and releases. Full-song media is never part of browse or discovery responses.

## Public Safety

Discovery results are sourced from published public services only. Responses must not include draft records, archived records, private storage paths, signed URLs, full-song references, upload jobs, processing jobs, audit history, or admin metadata.

## Frontend Integration

The public search page uses the production search endpoint for grouped artist, release, and gallery results. The public browse page uses the production browse endpoint for catalog data, genre/style counts, and sorted release lists. URL query parameters remain the source of shareable search and browse state.

## CLI

- `npm run search:verify`
- `npm run search:health`
- `npm run search:safety-scan`
- `npm run search:indexes`
- `npm run search:explain`
- `npm run search:reconcile`
- `npm run search:rebuild`
- `npm run search:load-test`

These commands currently execute the same bounded discovery verification harness. Staging MongoDB explain-plan and dedicated load testing remain ANM-WEB-100+ operational hardening work.

## Known Limitations

The current implementation uses public projection services as the safe source of truth. In staging/production, those services are backed by published MongoDB records. A dedicated external search index is not introduced in this prompt.

Full browser accessibility, visual responsive QA, and production load testing require the staging environment.
