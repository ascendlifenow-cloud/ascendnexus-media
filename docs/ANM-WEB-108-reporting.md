# ANM-WEB-108 Reporting

## Report Types

The intelligence reporting service supports:

- Daily artist report
- Weekly artist report
- Monthly growth report
- Quarterly executive report
- Annual performance report
- Platform comparison report
- Campaign report
- SEO report
- Audience report
- Release report

## Report Contents

Reports include:

- Executive summary
- Key metrics
- Trends
- Recommendations
- Risks
- Source references
- Generated timestamp

## Admin Routes

- `GET /api/admin/intelligence/reports`
- `POST /api/admin/intelligence/reports`
- `/admin/reports`

## CLI

Run:

```bash
npm run intelligence:reports
```

## Operational Policy

Reports are generated from available production records. Missing external-provider metrics are reported as limitations instead of estimated as real values.
