# ANM-WEB-106 Content Calendar

The publishing calendar stores durable `PublishingCalendarEventRecord` entries for upcoming releases, scheduled releases, publishing windows, social campaigns, email campaigns, deadlines, milestones, marketing events, platform promotions, homepage features, artist spotlights, anniversaries, and seasonal releases.

Calendar events can link to workflows, entities, and campaigns. Scheduled workflows automatically create calendar events when appropriate.

## Operating Policy

- Calendar events are planning records until the linked publication or campaign system confirms execution.
- Future publishing requires a production scheduler or worker.
- Embargo dates are stored on release workflows and surfaced to operators.
- Public configuration is not modified until publication or cache refresh steps succeed.
