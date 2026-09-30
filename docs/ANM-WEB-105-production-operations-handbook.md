# ANM-WEB-105 Production Operations Handbook

## Daily Checks

- `npm run observability:health -- --environment=production --json`
- `npm run reliability:health -- --environment=production --json`
- `npm run reliability:consistency-check -- --environment=production --json`
- `npm run launch:certification -- --environment=production --json`

## Dashboards

Use `/admin/system/observability`, `/admin/system/deployment`, `/admin/media/processing`, `/admin/seo`, and security/admin health pages for protected operational views.

## Incidents

Open a reliability incident for critical health failure, private-media exposure, full-song exposure, public API outage, worker outage, storage/CDN outage, publication failure, or alert-delivery failure. Link related security incidents rather than duplicating sensitive exploit detail.

## Emergency Actions

- Enable maintenance mode through deployment controls.
- Roll back using deployment rollback procedure.
- Pause workers through media processing controls.
- Stop publication by disabling publication workers and locks according to ANM-WEB-095.
- Remove exposed media by storage/CDN takedown runbooks.

## Privacy

Never paste credentials, signed URLs, full-song URLs, private paths, contact messages, newsletter emails, or raw search queries into telemetry, incidents, or postmortems.
