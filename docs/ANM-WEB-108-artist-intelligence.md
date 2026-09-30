# ANM-WEB-108 Artist Intelligence Platform

## Purpose

ANM-WEB-108 adds the business intelligence layer for Ascend Nexus Media. It aggregates website analytics, distribution analytics, release records, artist records, SEO health, and campaign workflow data into admin-facing intelligence dashboards and persisted intelligence records.

The platform answers operational questions such as:

- Which artists are growing?
- Which songs and releases are performing best?
- Which platforms are strongest?
- Which artists need attention?
- Which actions should operations take next?

## Data Model

The implementation adds durable JSON-database collections and production collection definitions for:

- `artist_intelligence_snapshots`
- `intelligence_insights`
- `intelligence_reports`
- `growth_forecasts`

Snapshots store normalized per-artist audience, content, platform, and recommendation data by period. Insights store generated trend, anomaly, recommendation, and executive-summary records. Reports store generated daily, weekly, monthly, quarterly, annual, platform, campaign, SEO, audience, and release reports. Forecasts store simple model outputs for traffic, follower, publishing-volume, storage, and processing projections.

## Admin Routes

Protected admin intelligence routes are exposed under:

- `GET /api/admin/intelligence/overview`
- `GET /api/admin/intelligence/artists/:artistId`
- `GET /api/admin/intelligence/audience`
- `GET /api/admin/intelligence/trends`
- `POST /api/admin/intelligence/trends`
- `GET /api/admin/intelligence/recommendations`
- `POST /api/admin/intelligence/recommendations`
- `GET /api/admin/intelligence/platform-comparison`
- `GET /api/admin/intelligence/growth-forecast`
- `POST /api/admin/intelligence/growth-forecast`
- `GET /api/admin/intelligence/reports`
- `POST /api/admin/intelligence/reports`
- `GET /api/admin/intelligence/campaigns`
- `GET /api/admin/intelligence/content`

Routes require `intelligence.read`, `intelligence.manage`, or `intelligence.reports` according to the operation.

## Admin Pages

The main dashboard is available at:

- `/admin/intelligence`

Additional navigation routes share the same intelligence experience with scoped views:

- `/admin/artists/intelligence`
- `/admin/artists/:artistId/intelligence`
- `/admin/audience`
- `/admin/trends`
- `/admin/recommendations`
- `/admin/platform-comparison`
- `/admin/growth-forecast`
- `/admin/reports`

## Services

Implemented services:

- `ArtistIntelligenceService`
- `AudienceGrowthService`
- `TrendDetectionService`
- `RecommendationEngine`
- `CampaignAnalyticsService`
- `ContentPerformanceService`
- `PlatformComparisonService`
- `GrowthForecastService`
- `SeoPerformanceService`
- `ReleasePerformanceService`
- `IntelligenceReportService`

These services aggregate existing production records rather than seed-only intelligence.

## Verification

CLI entry points:

- `npm run intelligence:health`
- `npm run intelligence:verify`
- `npm run intelligence:audience`
- `npm run intelligence:trends`
- `npm run intelligence:recommendations`
- `npm run intelligence:platform-comparison`
- `npm run intelligence:forecast`
- `npm run intelligence:reports`
- `npm run intelligence:content`
- `npm run intelligence:seo`

## Known Limitations

External platform revenue, search-engine ranking, and social audience data depend on connected providers and ANM-WEB-107 distribution analytics. The platform does not fabricate unavailable metrics; missing provider data is surfaced as incomplete or zero-volume intelligence until integrations provide real records.
