# ANM-WEB-114 Member Portal

## Implementation

ANM-WEB-114 adds the authenticated member portal at `/member`, backed by server-side member sessions and a private dashboard API.

Implemented:

- Member route guard and application shell.
- Entitlement-aware navigation.
- Dashboard API and dashboard service.
- Membership and capability summaries.
- Recent releases, recommendations, early access, exclusives, galleries, and announcements.
- Profile, preferences, security, and sessions pages.
- Member-scoped cache service.
- Logout and session cleanup paths.
- Account-state pages for verification, expiration, suspension, and session expiration.
- Admin member-experience health page.
- Member portal health and verification CLI commands.

## Security Rules

Member APIs derive member ID from the current session only. Dashboard and member pages never include protected stream URLs, download URLs, signed URLs, storage paths, private object keys, or full-song source fields. Protected media remains authorized on demand through the ANM-WEB-113 delivery layer.

## SEO And Crawler Policy

Member APIs set `X-Robots-Tag: noindex, nofollow` and private no-store cache headers. Member routes are authenticated application routes and are not added to public sitemap, RSS, or metadata feeds.

## Handoff

ANM-WEB-115 will activate persistent favorites, following, playlists, listening history, and notification-center workflows. ANM-WEB-117 will activate real billing synchronization.
