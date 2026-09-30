# ANM-WEB-103 Deployment Operations Runbook

## Build or Artifact Failure

Run `npm run build:production` and `npm run deployment:verify-artifact`. Do not deploy when source maps, env files, missing dist output, or full-song-like files are found.

## Configuration Failure

Run `npm run config:check -- --environment=production --strict`. Fix environment-scoped secrets and URLs in the secret manager, not in source.

## API or Worker Startup Failure

Check `/health/ready`, logs, MongoDB, Redis, storage, and queue configuration. Stop traffic shift if readiness fails.

## Migration Failure

Stop deployment, preserve logs, verify lock state, restore from backup if needed, and do not start incompatible application versions.

## DNS/TLS Failure

Run `deployment:dns-verify` and `deployment:tls-verify`. Check CAA, ACME, certificate SANs, redirects, and HSTS.

## Smoke-Test Failure

Abort production launch or rollback. Verify public site, public APIs, admin login, workers, forms, analytics/consent, and media privacy.

## Rollback

Use `npm run deployment:rollback -- --release=<release-id>` only through protected operator context. Confirm migration compatibility first.

## Full-Song or Private-Media Exposure

Treat as P0 security incident. Disable public delivery path if required, preserve evidence, rotate affected credentials, and run ANM-WEB-102 incident playbooks.
