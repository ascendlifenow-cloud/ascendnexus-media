# ANM-WEB-105 Observability Architecture Decision

## Decision

Ascend Nexus Media Web uses one authoritative telemetry path per signal type:

- Metrics: `ProductionMetricsService` with provider export readiness through `MONITORING_PROVIDER`.
- Logs: `ProductionLogger` JSON logs with redaction before collector transport.
- Error monitoring: `ProductionErrorMonitoringService` with provider isolation and sanitized context.
- Traces: `ProductionTracingService` with bounded attributes and sampling from monitoring configuration.
- Synthetics: `SyntheticMonitoringService` and approved external uptime/browser checks.
- Dashboards and alerts: protected admin observability APIs plus the selected production monitoring provider.
- Certification: `ProductionLaunchCertificationService`.

## Privacy Policy

Telemetry must not include passwords, tokens, cookies, signed URLs, private storage paths, contact messages, newsletter emails, raw search queries, full-song URLs, or admin-only content. Metric attributes are allowlisted and bounded.

## Known Limitations

This workspace cannot prove provider-side ingestion, alert delivery, production traces, staging fault injection, backup restore freshness, or live production browser synthetics. Those remain certification blockers.
