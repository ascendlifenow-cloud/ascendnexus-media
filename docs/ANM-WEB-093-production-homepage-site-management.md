# ANM-WEB-093 Production Homepage & Site Content Management

## Architecture

Homepage and site configuration now use versioned backend persistence instead of hardcoded live component state.

- Admin site routes: `/api/admin/site-settings`
- Admin homepage routes: `/api/admin/homepage`
- Public site route: `/api/public/site`
- Public homepage route: `/api/public/homepage`
- Repositories: `HomepageRepository`, `SiteConfigRepository`
- Service: `AdminSiteConfigurationService`
- Validation: `SiteConfigurationValidationService`
- Section registry: `HomepageSectionRegistry`

The admin frontend continues to use the existing homepage/settings pages, but its site configuration client is API-backed. Public homepage rendering reads published configuration through the public delivery API and only falls back to configured defaults when the public API is unavailable in development.

## Versioning Model

Configuration records support:

- `draft`
- `published`
- `archived`

Publication state supports:

- `draft`
- `ready_to_publish`
- `publishing`
- `published`
- `publish_failed`
- `archived`

Only one homepage version and one site configuration version may be active as published. Draft edits create or update a separate draft and do not mutate the live published version. Publication atomically activates the draft, preserves prior published versions, and invalidates public content caches. Rollback reactivates a previous version through the same public-safe path.

## Homepage Sections

The launch registry supports:

- `hero`
- `featured_release`
- `latest_releases`
- `artist_spotlight`
- `gallery_preview`
- `about`
- `explore_artists_cta`
- `custom`

Unsupported section types are rejected. Disabled sections remain editable in the draft but are filtered from the public homepage response.

## Ordering And Visibility

Homepage section order is persisted through normalized `sortOrder` values. The admin homepage page supports keyboard-accessible move up/down actions and visibility toggles. Public ordering updates only after publish succeeds.

## Hero And Media

Hero, brand, fallback, and section media fields are validated as public-safe URLs. Private paths, signed query strings, blob/object URLs, and secret-like values are rejected from public configuration. New media should still be assigned through the Media Library/upload workflows from ANM-WEB-087 through ANM-WEB-092 before publication.

## Navigation And Footer

Site configuration stores ordered navigation and footer links. Internal routes are allowlisted and external links must use HTTPS. Admin routes and unsafe protocols are blocked.

Supported internal routes include:

- `/`
- `/artists`
- `/songs`
- `/gallery`
- `/about`
- `/contact`
- `/search`
- `/browse`
- `/privacy`
- `/terms`

## Social, Contact, Theme

Public social links require HTTPS and are published only when enabled. Contact settings expose only explicitly public values such as public email, contact CTA text, and contact page availability. Theme configuration is bounded to existing design-system tokens and does not allow arbitrary CSS or script injection.

## Preview And Readiness

Readiness checks validate site identity, homepage sections, section ordering, CTA/navigation/footer URLs, social links, private media exposure, and newsletter/contact operational constraints.

The admin routes expose draft, readiness, preview-compatible draft reads, publish, archive, versions, restore, and rollback endpoints. Draft preview remains admin-protected.

## Public API Behavior

`/api/public/site` returns safe published site configuration, including navigation, footer, social, contact, theme, and fallback media settings.

`/api/public/homepage` returns public homepage content plus enabled published sections. Public payloads omit private storage paths, draft metadata, publication internals, disabled sections, signed URLs, and secret-like values.

## Publication And Rollback

Publish flow:

1. Authenticate and authorize.
2. Validate draft configuration.
3. Activate the draft as the sole published version.
4. Preserve the prior public version.
5. Invalidate public site, homepage, search, browse, and metadata caches.
6. Record audit events.

Rollback selects a retained version, validates it, reactivates it, invalidates public caches, and preserves newer failed/superseded versions for audit history.

## Known Limitations

Local verification uses the in-process repository and smoke API. Live staging verification is still required for real MongoDB persistence, Media Library brand/hero uploads, CDN URL retrieval, browser responsive QA, accessibility tooling, and full admin E2E. Newsletter signup remains disabled unless its backend is enabled by a later contact/newsletter prompt.
