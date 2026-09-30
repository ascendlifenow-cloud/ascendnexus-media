# ANM-WEB-103 Production Infrastructure Deployment

This repository now includes deployment records, launch-gate services, deployment health endpoints, container scaffolds, runtime version pins, CLI verification commands, and protected admin deployment APIs.

## Required Launch Commands

```bash
npm run config:check -- --environment=production --strict
npm run security:launch-gate
npm run build:production
npm run deployment:verify-artifact
npm run deployment:dns-verify -- --hostname=<production-domain>
npm run deployment:tls-verify -- --hostname=<production-domain>
npm run deployment:smoke-test -- --environment=production --target=https://<production-domain>
npm run deployment:launch-check -- --environment=production
```

## Health Endpoints

- `GET /health/live`: process liveness.
- `GET /health/ready`: configuration, database, worker, and security readiness summary.
- `GET /api/public/health`: public health.
- `GET /api/admin/deployment/overview`: authenticated deployment dashboard data.

## Deployment Order

1. Validate ANM-WEB-102 security gate.
2. Validate production config.
3. Confirm backups and restore evidence.
4. Build immutable artifact and record digest.
5. Deploy/verify staging with production-like resources.
6. Approve production deployment.
7. Apply migration plan with lock and backup checkpoint.
8. Deploy API, workers, then client.
9. Run public/admin/worker smoke tests.
10. Verify storage/CDN/full-song privacy.
11. Run launch gate and record decision.

## Known Limitations

Production provider resources, DNS, TLS, monitoring, alerts, backup/restore evidence, and staging rehearsal are not available in this local repository. The launch gate blocks until that evidence is supplied.
