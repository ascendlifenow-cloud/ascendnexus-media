# ANM-WEB-115 Favorites

Members can save songs, releases, albums, artists, videos, gallery items, playlists, and collections as favorites.

Rules:

- Favorite records are member-owned.
- Removed favorites are soft-removed for audit and recovery readiness.
- Duplicate favorite requests reactivate the same resource for the member.
- Public-safe resource titles, slugs, and images may be stored.
- Protected URLs, storage paths, full-song references, and signed delivery artifacts are rejected from resource references.

Verification:

- `npm run member-engagement:favorites-test`
- `npm run member-engagement:privacy-scan`
