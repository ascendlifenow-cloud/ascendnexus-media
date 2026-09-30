# ANM-WEB-106 Post-Launch Operations

ANM-WEB-106 adds the operational layer for running Ascend Nexus Media after launch. The system now has durable records for release workflows, publishing calendar events, release templates, social/newsletter campaigns, release verification runs, lifecycle records, operational metrics snapshots, optimization recommendations, and generated operational reports.

## Architecture

The implementation uses the existing JSON/Mongo persistence bridge and collection registry. Admin APIs are protected by `operations.read`, `operations.manage`, `release.workflow.manage`, `campaigns.manage`, `reports.read`, and `optimization.read`.

The operations dashboard aggregates existing production systems instead of replacing them:

- Publication orchestration remains the source of truth for publication.
- Public delivery services verify public artists, releases, gallery, homepage, and metadata state.
- SEO/sitemap services verify search visibility readiness.
- Public cache invalidation is used for homepage/search refresh.
- Observability and reliability services provide launch health, queue health, and consistency status.

## Admin Surface

The operations console is available at:

- `/admin/operations`
- `/admin/release-calendar`
- `/admin/content-pipeline`
- `/admin/artist-roadmap`
- `/admin/publishing-queue`
- `/admin/release-verification`
- `/admin/social-campaigns`
- `/admin/newsletter-campaigns`
- `/admin/content-health`
- `/admin/optimization`
- `/admin/platform-growth`

These routes use the same operations console with focused headings so operators can navigate by workflow area without duplicating state.

## CLI Verification

Use:

- `npm run operations:health`
- `npm run operations:verify`
- `npm run operations:calendar`
- `npm run operations:workflow-check`
- `npm run operations:verification`
- `npm run operations:recommendations`
- `npm run operations:content-health`
- `npm run operations:report`
- `npm run operations:metrics`
- `npm run operations:lifecycle`
- `npm run operations:growth`

Blocking statuses return non-zero when the CLI detects critical content health or unavailable launch health.

## Known Limitations

Live provider sends for social and newsletter campaigns are intentionally not simulated. Campaign records are generated and scheduled, but production send execution requires approved provider credentials, rate limits, and compliance review. Timed future publishing also requires a deployed scheduler or worker process in the production environment.
