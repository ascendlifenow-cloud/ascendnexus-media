# ANM-WEB-106 Release Workflow

Release workflows support singles, EPs, albums, music videos, gallery collections, blogs, announcements, playlists, featured collections, artist launches, seasonal events, and promotional campaigns.

## States

`draft`, `internal_review`, `content_review`, `artwork_review`, `metadata_review`, `seo_review`, `publishing_review`, `scheduled`, `publishing`, `published`, `verified`, `archived`, `cancelled`, `rollback`, `paused`, and `failed`.

Invalid transitions are rejected by `ReleaseWorkflowService`. Transition history is stored in workflow metadata with actor, note, source state, target state, and timestamp.

## Automated Pipeline

Each workflow receives these default steps:

1. Validate Content
2. Verify Media
3. Verify Metadata
4. Verify SEO
5. Verify Images
6. Verify Audio Preview
7. Publish
8. Update Homepage
9. Update Artist
10. Update Search
11. Update Sitemap
12. Update RSS
13. Refresh Cache
14. Generate Social Posts
15. Queue Newsletter
16. Verify Public Site
17. Record Analytics Baseline
18. Mark Release Complete

Required failures pause the workflow. Completion is only allowed after release verification passes.

## Publication Boundary

The operations pipeline does not bypass publication permissions or the publication orchestration service. It coordinates readiness, cache/search/sitemap refresh, campaign scheduling, verification, and reporting around the existing publication workflow.
