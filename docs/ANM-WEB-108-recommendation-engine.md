# ANM-WEB-108 Recommendation Engine

## Purpose

The recommendation engine turns artist, release, analytics, SEO, and distribution signals into operational recommendations.

## Initial Recommendation Types

The implementation currently generates recommendations for:

- Artist launch readiness
- Release cadence
- Social/content follow-up
- Homepage and campaign promotion opportunities
- SEO and content performance follow-up through intelligence summaries

## Recommendation Record

Recommendations are persisted as `intelligence_insights` with:

- `insightType = recommendation`
- Scope
- Severity
- Confidence score
- Recommended action
- Evidence summary
- Source metrics

## Examples

- Release a first single for an artist with no catalog.
- Increase posting frequency for artists with catalog depth but low recent activity.
- Promote high-performing releases on homepage or social channels.
- Refresh metadata or descriptions when SEO health indicates weak coverage.

## Review Policy

Recommendations are advisory. They do not automatically publish content, mutate campaigns, or alter metadata without an explicit workflow in the operations layer.
