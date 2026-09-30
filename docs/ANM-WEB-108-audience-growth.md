# ANM-WEB-108 Audience Growth

## Overview

Audience growth is calculated from existing analytics events and distribution analytics. The audience service summarizes website visits, returning visitors, stream/play events, follower-like platform metrics, email activity, and platform totals into a single operational view.

## Metrics

Tracked audience metrics include:

- Website views
- Streams and playback events
- Returning visitors
- Email opens
- Email clicks
- Platform engagement
- Platform follower/subscriber indicators where provider data exists

## Growth Windows

Supported intelligence periods:

- `day`
- `week`
- `month`
- `quarter`
- `year`
- `lifetime`

The current implementation computes trend direction from available event volume and platform analytics. Provider-specific follower deltas are included when synced by distribution connectors.

## Admin Use

The audience dashboard is available at `/admin/audience` and through `/admin/intelligence`.

## Data Safety

Audience aggregation uses event counts and metric summaries. It does not expose personal contact data, raw emails, or private media paths in admin intelligence responses.
