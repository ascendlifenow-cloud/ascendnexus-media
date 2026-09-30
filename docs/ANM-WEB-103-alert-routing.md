# ANM-WEB-103 Alert Routing

| Alert | Severity | Owner | Expected Action |
| --- | --- | --- | --- |
| Public site unavailable | P0 | Deployment operator | Run launch runbook and rollback evaluation |
| API readiness failed | P0 | Deployment operator | Stop traffic shift, inspect API logs |
| Full-song/privacy exposure | P0 | Security approver | Trigger security incident playbook |
| Database unavailable | P0 | Infrastructure owner | Fail over or restore according to DR plan |
| Redis/queue unavailable | P1 | Infrastructure owner | Pause worker launch, recover queue |
| Worker unavailable/backlog | P1 | Deployment operator | Scale/restart workers, inspect dead letters |
| TLS certificate expiration | P1 | Infrastructure owner | Renew cert, verify HSTS/redirects |
| Backup failure | P1 | Infrastructure owner | Re-run backup and validate retention |
| Smoke-test failure | P0/P1 | Deployment operator | Abort deploy or rollback |
| Security gate failure | P0 | Security approver | Block deployment until resolved |

Channels and exact response commitments must be configured in the selected monitoring provider.
