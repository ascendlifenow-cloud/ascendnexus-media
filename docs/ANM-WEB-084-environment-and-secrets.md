# ANM-WEB-084 Environment & Secrets Management

This project now has a centralized, typed configuration foundation for the backend API, workers, public runtime config, and deployment readiness checks.

## Architecture

- Backend config entrypoint: `server/config/index.ts`
- Deployment environment resolver: `server/config/environment.ts`
- Typed backend config: `server/config/backendConfig.ts`
- Parsers and validation: `server/config/configParsers.ts`, `server/config/configValidation.ts`
- Secret redaction: `server/config/configRedaction.ts`
- Safe health report: `server/config/configHealth.ts`
- CLI: `npm run config:check -- --environment=production --strict`
- Public runtime config endpoint: `GET /api/public/config`
- Admin config health endpoint: `GET /api/admin/system/configuration/health`

`APP_ENV` is authoritative and supports `development`, `test`, `staging`, and `production`. `NODE_ENV` is still useful for build/runtime optimization, but it does not replace deployment intent.

## Startup Validation

Development permits explicit local defaults and reports warnings. Production strict mode rejects:

- mock/local storage as the production provider
- public seed fallback
- auth disabled or default dev token
- weak auth secrets
- insecure cookies
- wildcard/unsafe CORS
- missing persistent MongoDB config
- missing Redis when workers/cache require it
- disabled workers/publication
- missing public URLs
- missing production storage
- detailed production errors
- simulated email/processing readiness where a production feature depends on them

The server validates before listening. Production fatal issues throw `ConfigurationError` with safe issue codes and no raw secret values.

## Frontend-Safe Configuration

The frontend may load safe runtime config from `VITE_PUBLIC_CONFIG_URL`, typically `/api/public/config`. The public config contains only:

- environment and app version
- public API/app/admin URLs
- CDN public base URL
- public analytics identifiers
- public feature flags
- safe build metadata

It never contains database URIs, Redis URLs, storage keys, auth secrets, email credentials, monitoring secrets, private paths, or signed URLs.

## Environment Templates

Created:

- `.env.example`
- `.env.development.example`
- `.env.test.example`
- `.env.staging.example`
- `.env.production.example`

Templates contain no real secrets. Placeholders such as `<GENERATE_A_STRONG_SECRET>` are intentionally rejected by production validation.

## Backend-Only Secrets

Keep these out of Vite variables and browser bundles:

- `MONGODB_URI`
- `REDIS_URL`
- `AUTH_SESSION_SECRET`
- `AUTH_ACCESS_TOKEN_SECRET`
- `AUTH_REFRESH_TOKEN_SECRET`
- `MEDIA_STORAGE_ACCESS_KEY_ID`
- `MEDIA_STORAGE_SECRET_ACCESS_KEY`
- `EMAIL_API_KEY`
- `EMAIL_SMTP_PASSWORD`
- `ANALYTICS_API_SECRET`
- `MONITORING_DSN` unless the selected provider explicitly uses a public DSN

## Secret Generation

Generate production secrets with a password manager or standard tools, then inject them through the deployment platform or secret manager. Example:

```sh
openssl rand -base64 48
```

Do not commit generated secrets. Rotate secrets through the hosting provider or cloud secret manager. Auth signing-secret rotation should be revisited during ANM-WEB-085 when the real auth/session architecture lands.

## Secret Rotation Readiness

Rotate these through deployment secret injection:

- auth/session token secrets
- storage access keys
- database credentials
- Redis credentials
- email provider keys
- monitoring credentials

Storage and email keys can usually rotate by deploying both provider-side and app-side changes together. Token signing rotation may require multiple active keys; that is tracked for ANM-WEB-085.

## Mock Restrictions

Development and test can use local/mock services intentionally. Staging and production should run with `CONFIG_STRICT_MODE=true` and must disable:

- `MEDIA_STORAGE_MOCK_ENABLED`
- `MEDIA_STORAGE_ALLOW_PRODUCTION_MOCK_FALLBACK`
- `PUBLIC_API_SEED_FALLBACK_ENABLED`
- `MEDIA_AUTH_DISABLED`

## Health Reporting

Admin-only health:

- `GET /api/admin/system/configuration/health`
- Requires `system.configuration.read`
- Returns service status and issue codes only
- Never returns raw URI, credentials, cookies, tokens, keys, or signed URLs

Public health remains minimal. Public config is not a diagnostics endpoint.

## CLI

Useful checks:

```sh
npm run config:check -- --environment=development
npm run config:check -- --environment=test
npm run config:check -- --environment=production --strict
npm run config:check -- --environment=production --strict --json
```

Production validation is expected to fail locally until real secrets and providers are injected.

## Remaining Direct Environment Access

Intentional or pending migration:

- `server/config/backendConfig.ts`: central parser; allowed.
- `server/config/mediaBackendConfig.ts`: compatibility facade; one legacy media bitrate read remains.
- `src/config/mediaStorageConfig.ts`: Vite build-time frontend storage config pending full runtime-config migration.
- Frontend admin media clients: still read `VITE_MEDIA_ADMIN_DEV_TOKEN`; ANM-WEB-084 flags this risk, and ANM-WEB-085/production auth must remove it.
- Smoke scripts: set local test env values; test-only.

## ANM-WEB-083 Findings Addressed

- PRF-008: environment templates and deployment-readiness config baseline added.
- PRF-009: storage provider validation and production mock rejection added.
- PRF-010: production seed fallback rejection added.
- PRF-013: frontend secret exposure documented and classified; production-safe runtime config added.
- PRF-016: security config validation added.
- PRF-024: dependency gaps are now explicit config/readiness issues.

Authentication and database implementations remain for ANM-WEB-085+.
