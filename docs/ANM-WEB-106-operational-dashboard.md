# ANM-WEB-106 Operational Dashboard

The admin operations dashboard shows:

- Today's releases and campaigns
- Upcoming scheduled releases
- Failed or paused release workflows
- Pending approvals
- Media processing queue health
- Publication queue health
- Social and newsletter campaign queues
- Content health
- Launch health
- Growth analytics
- Homepage automation state
- Optimization recommendations
- Operational reports

The dashboard uses `/api/admin/operations/overview` and related operations endpoints. It requires `operations.read`.

Actions include refresh, release QA verification, and daily report generation.
