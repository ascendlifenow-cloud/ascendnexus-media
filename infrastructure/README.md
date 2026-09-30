# Ascend Nexus Media Web Infrastructure

This directory records the production deployment contract for ANM-WEB-103.

The current repository is prepared for a managed/container deployment with separate logical services:

- `anm-web-client`
- `anm-web-api`
- `anm-web-media-worker`
- `anm-web-publication-worker`
- `anm-web-email-worker`
- `anm-web-scheduled-jobs`

Provider-specific Terraform/Pulumi/native manifests are still required once the final hosting, DNS, monitoring, and backup providers are provisioned. Until those provider resources exist, `npm run deployment:launch-check -- --environment=production` must remain blocked.
