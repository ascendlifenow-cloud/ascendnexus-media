# ANM-WEB-108 Trend Analysis

## Overview

Trend analysis compares recent analytics activity against the previous equivalent period and stores generated trend insights in `intelligence_insights`.

## Detected Trends

The first production implementation detects:

- Website traffic movement
- Stream/play movement
- Email engagement movement
- Active genre concentration
- Artist activity growth through artist snapshots
- Platform performance through distribution analytics

## Severity

Insights are classified as:

- `info`
- `low`
- `medium`
- `high`
- `critical`

Critical severity is reserved for operationally significant failures or safety problems. Growth trend records are normally informational or medium priority.

## Admin Use

Trend insights appear in:

- `/admin/intelligence`
- `/admin/trends`
- Artist intelligence profiles

## Limitations

Trend accuracy improves as more analytics, platform, and campaign records accumulate. The service avoids inventing external platform signals when connectors have not synced them.
