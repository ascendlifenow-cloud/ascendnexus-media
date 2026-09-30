# ANM-WEB-103 Environment Topology

## Local

- Domain: localhost only.
- Database: local JSON or developer MongoDB.
- Redis: optional.
- Storage/CDN/email/analytics: disabled, local, or test mode only.
- Data policy: disposable developer data.

## Test

- Domain: CI-local or ephemeral.
- Database/storage/Redis: isolated test resources or temporary files.
- Email/analytics/challenge: mocked or disabled.
- Data policy: generated fixtures only.

## Staging

- Domain: staging domain required before launch rehearsal.
- API URL/media URL/email link URL: staging-specific.
- Database/Redis/storage/CDN: separate from production.
- Email: approved test inbox/domain only.
- Analytics/challenge: staging keys.
- Deployment branch: protected staging branch or main promotion.
- Data policy: synthetic launch rehearsal data.

## Production

- Domain: final public domain only.
- API/media/admin/email links: production HTTPS origins.
- Database/Redis/storage/CDN: production-only resources.
- Email/analytics/challenge: production provider keys and domains.
- Secrets: environment-scoped secret manager, no committed plaintext.
- Logging/monitoring: centralized provider with alerts.
- Data policy: customer/public production records only.

Production must never share database, Redis namespace, storage prefixes, email keys, analytics IDs, or challenge keys with staging/test.
