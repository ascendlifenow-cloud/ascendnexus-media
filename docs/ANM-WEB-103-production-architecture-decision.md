# ANM-WEB-103 Production Architecture Decision

Decision: prepare a managed/container deployment with separate logical services and strict external-provider evidence before launch approval.

## Logical Services

- `anm-web-client`: production Vite client artifact served by static hosting or hardened nginx container.
- `anm-web-api`: Node API service with `/health/live`, `/health/ready`, public APIs, and admin APIs.
- `anm-web-media-worker`: media processing queues and storage-output generation.
- `anm-web-publication-worker`: public promotion, cache invalidation, and publication recovery.
- `anm-web-email-worker`: contact/newsletter delivery jobs.
- `anm-web-scheduled-jobs`: cleanup, reconciliation, retention, and health summary jobs.

## Provider Decisions

- Hosting provider: not selected in repo; deployment scaffolding is provider-agnostic.
- MongoDB provider: production MongoDB with TLS, least-privilege application and migration roles.
- Redis provider: production Redis with TLS/auth, isolated namespace or instance for queues/cache/rate limits.
- Object storage/CDN: production provider from ANM-WEB-087 configuration, private-first storage, public promotion prefixes only.
- Email, analytics, challenge, DNS, TLS, monitoring: provider bindings must be supplied through environment-scoped secrets.
- CI/CD: protected pipeline must promote the same immutable artifact from staging to production.

## Release Strategy

Recommended launch strategy: staging verification, migration-compatible deploy, API then workers then client, smoke tests, launch gate, preserve previous verified release. Blue/green or canary are not claimed until the selected platform supports them.

## Known Limitations

The current server and worker runtime use the repository TypeScript wrapper rather than a dedicated emitted server bundle. Production packaging can use the included container scaffolds only after the runtime wrapper/dependency policy is approved or a server emit pipeline is added.
