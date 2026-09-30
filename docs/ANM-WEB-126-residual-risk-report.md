# ANM-WEB-126 Residual Risk Report

## P1 Residual Risks

- Production email provider delivery and worker execution are not verified.

## P2 Residual Risks

- `media-intake:health` is disabled unless the process is started with `MEDIA_INTAKE_ENABLED=true`.
- Local development storage is healthy, but live object storage/CDN needs production evidence.
- Some launch checks are local database/service checks and should be repeated against staging and production.
- Staging E2E rehearsal is not recorded.
- Production-domain smoke, cache, CDN, protected-media, and service-worker verification are not recorded.
- Local restored snapshot contains 13 media asset records without storage objects from legacy smoke fixtures.

## Accepted Local Conditions

- The local development server can run with LAN access and media intake enabled.
- Superadmin seeded credentials work locally.
- Public content and admin APIs are available locally.

## Required Closure

Before public launch, run the launch commands against staging and production-safe environments, attach browser E2E evidence, verify email inbox delivery, and confirm zero P0/P1 results from `npm run launch:smoke`.
