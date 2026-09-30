# ANM-WEB-097 Production Client Pages, Navigation & Responsive Experience

## Architecture

The public client now renders through the production public delivery stack instead of seed-only page state. Public routes are defined in `src/routes/AppRouter.tsx`, rendered inside `PublicShell`, and backed by the `/api/public/*` services completed through ANM-WEB-096.

The public shell loads published site configuration with `usePublicSiteConfig`, maps safe navigation/footer/social links, rejects admin/API/private routes, and preserves accessible mobile navigation behavior. Public page metadata continues through `PublicPageMetadata`, `RouteMetadata`, and `/api/public/metadata`.

## Routes

Supported public routes:

- `/`
- `/artists`
- `/artists/:artistSlug`
- `/songs`
- `/songs/:songSlug`
- `/releases`
- `/gallery`
- `/search`
- `/browse`
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `404`

`/privacy` and `/terms` are route-ready and metadata-backed. Final legal text remains a content/legal approval task; the pages intentionally do not invent binding policy language.

## Navigation And Footer

Published site configuration is the source of truth for public navigation and footer links. The client filters disabled and unsafe links before rendering. Static defaults remain only as a defensive render fallback when the site configuration request is unavailable during development.

## Public Content

Homepage, artist, release, gallery, search, browse, contact, and metadata data are retrieved through public API hooks. Production seed fallback is disabled unless `VITE_PUBLIC_API_SEED_FALLBACK_ENABLED=true` is explicitly configured.

## Responsive And Accessibility

The shell includes:

- Skip link to the public content landmark.
- Keyboard and Escape handling for mobile navigation.
- Responsive public header and footer.
- Loading, error, empty, and not-found states on public pages.
- Route metadata updates on navigation.

## Verification

`npm run public-client:verify` starts the local media API server and verifies:

- Metadata availability for public routes.
- Public site, homepage, artist, release, and gallery API payloads.
- No obvious private/signed/full-song/admin fields in public responses.
- Published navigation exists and excludes unsafe routes.

Additional checks:

- `npm run typecheck`
- `npm run build`
- Existing public API and public delivery smoke tests.

## Known Limitations

- Full browser E2E, visual regression, mobile device checks, and screen-reader QA still require a staging browser environment.
- Final legal copy for privacy and terms must be supplied by the business/legal owner.
- Live CDN/media URL verification requires configured staging storage/CDN.

