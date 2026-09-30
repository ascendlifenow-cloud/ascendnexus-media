# ANM-WEB-105 Observability Operations Runbook

## Metrics Unavailable

Run `npm run observability:metrics-check -- --json`. If provider ingestion is down, use health endpoints and structured logs as temporary compensating controls.

## Logs Unavailable

Run `npm run observability:logs-check -- --json`. Confirm JSON logs are emitted and collector transport is configured.

## Error Monitoring Unavailable

Run `npm run observability:errors-check -- --json`. Do not disable error reporting silently; document provider outage.

## Synthetic Failure

Run `npm run observability:synthetics -- --environment=production --json`, inspect failed check, confirm user impact, and link to the service runbook.

## Queue Backlog

Run `npm run reliability:queue-reconcile -- --json` and check `/admin/media/processing`.

## Storage/CDN Failure

Run `npm run reliability:storage-reconcile -- --json` and storage/CDN health checks.

## SLO Breach

Run `npm run reliability:error-budget -- --json`. If budget is exhausted, pause non-emergency releases until impact is understood.

## Certification Blocked

Run `npm run launch:certification -- --environment=production --json`; address every `blockingIssues` entry.
