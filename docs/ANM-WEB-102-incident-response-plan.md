# ANM-WEB-102 Incident Response Plan

Severity levels:

- SEV-1: confirmed private media/full-song/secret/data exposure or active auth bypass.
- SEV-2: likely high-impact vulnerability, provider compromise, or sustained abuse.
- SEV-3: contained security degradation or suspicious activity.
- SEV-4: low-impact finding or false-positive review.

Process:

1. Detect through security health, logs, provider alerts, user report, or scan.
2. Triage scope, affected assets, active exploitation, and data classes.
3. Preserve evidence: logs, audit records, object versions, deployment version, timestamps.
4. Contain: disable affected provider, revoke sessions, rotate credentials, unpublish content, pause queues, or lock storage.
5. Eradicate root cause and deploy remediation.
6. Recover with verification: public API safety, full-song/private-media scan, config check, build, and targeted smoke tests.
7. Escalate legal/privacy notification review without inventing legal deadlines.
8. Complete post-incident review with timeline, controls, and follow-up owners.

Emergency actions include admin session revocation, storage credential rotation, public content unpublish, cache purge, analytics disable, form disable, queue pause, and publication rollback.
