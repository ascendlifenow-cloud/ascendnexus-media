# ANM-WEB-121 Admin Artist Release Overview

The Admin Dashboard now includes an Artist Release Overview backed by the existing admin artist and release queries.

## Behavior

- Shows active roster artists only.
- Each artist is collapsible.
- Each expanded artist shows Published Songs and In Progress Songs.
- In-progress releases include non-published, non-archived release records.
- Operators can filter by artist name, artist slug, release title, release slug, or song ID.
- Operators can toggle an in-progress-only view.
- Each release row includes admin Edit and, when published, Public actions.

## Safety

- The overview uses existing admin data already loaded by the dashboard.
- No public-media URLs or protected media URLs are introduced.
- Public links are generated through the centralized release route builder.

## Known Limitations

- The section is currently read-only aside from quick links.
- Production verification still requires browser E2E coverage.
