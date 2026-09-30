# Production Environment Matrix

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

No secret values are included.

| Category | Variable | State | Required | Sensitive | Summary |
| --- | --- | --- | --- | --- | --- |
| Application | NODE_ENV | optional | no | no | Optional or feature-dependent. |
| Application | APP_ENV | optional | no | no | Optional or feature-dependent. |
| Application | APP_VERSION | optional | no | no | Optional or feature-dependent. |
| Application | APP_COMMIT_SHA | optional | no | no | Optional or feature-dependent. |
| Domains | PUBLIC_APP_BASE_URL | optional | no | no | Optional or feature-dependent. |
| Domains | ADMIN_APP_BASE_URL | optional | no | no | Optional or feature-dependent. |
| Domains | PUBLIC_API_BASE_URL | optional | no | no | Optional or feature-dependent. |
| Security | CORS_ALLOWED_ORIGINS | optional | no | no | Optional or feature-dependent. |
| Database | MONGODB_URI | optional | no | yes | Optional or feature-dependent. |
| Database | MONGODB_DATABASE | optional | no | no | Optional or feature-dependent. |
| Redis | REDIS_URL | optional | no | yes | Optional or feature-dependent. |
| Redis | REDIS_TLS_REQUIRED | optional | no | no | Optional or feature-dependent. |
| Storage | MEDIA_STORAGE_PROVIDER | optional | no | no | Optional or feature-dependent. |
| Storage | MEDIA_STORAGE_ENDPOINT | optional | no | no | Optional or feature-dependent. |
| Storage | MEDIA_STORAGE_BUCKET | optional | no | no | Optional or feature-dependent. |
| Storage | MEDIA_STORAGE_ACCESS_KEY_ID | optional | no | yes | Optional or feature-dependent. |
| Storage | MEDIA_STORAGE_SECRET_ACCESS_KEY | optional | no | yes | Optional or feature-dependent. |
| Storage | MEDIA_STORAGE_PUBLIC_BASE_URL | optional | no | no | Optional or feature-dependent. |
| CDN | MEDIA_CDN_ENABLED | optional | no | no | Optional or feature-dependent. |
| CDN | MEDIA_CDN_BASE_URL | optional | no | no | Optional or feature-dependent. |
| Email | EMAIL_ENABLED | optional | no | no | Optional or feature-dependent. |
| Email | EMAIL_PROVIDER | optional | no | no | Optional or feature-dependent. |
| Email | EMAIL_API_KEY | optional | no | yes | Optional or feature-dependent. |
| Email | EMAIL_SMTP_HOST | optional | no | no | Optional or feature-dependent. |
| Email | EMAIL_SMTP_USER | optional | no | yes | Optional or feature-dependent. |
| Email | EMAIL_SMTP_PASSWORD | optional | no | yes | Optional or feature-dependent. |
| Email | EMAIL_FROM_ADDRESS | optional | no | no | Optional or feature-dependent. |
| Authentication | AUTH_ENABLED | optional | no | no | Optional or feature-dependent. |
| Authentication | AUTH_SESSION_SECRET | optional | no | yes | Optional or feature-dependent. |
| Authentication | AUTH_ACCESS_TOKEN_SECRET | optional | no | yes | Optional or feature-dependent. |
| Authentication | AUTH_REFRESH_TOKEN_SECRET | optional | no | yes | Optional or feature-dependent. |
| Authentication | AUTH_COOKIE_NAME | optional | no | no | Optional or feature-dependent. |
| Authentication | AUTH_COOKIE_DOMAIN | optional | no | no | Optional or feature-dependent. |
| Authentication | AUTH_COOKIE_SECURE | optional | no | no | Optional or feature-dependent. |
| Security | SECURITY_HELMET_ENABLED | optional | no | no | Optional or feature-dependent. |
| Security | SECURITY_CSP_ENABLED | optional | no | no | Optional or feature-dependent. |
| Security | SECURITY_CSRF_ENABLED | optional | no | no | Optional or feature-dependent. |
| Workers | MEDIA_WORKERS_ENABLED | optional | no | no | Optional or feature-dependent. |
| Media | FFMPEG_PATH | optional | no | no | Optional or feature-dependent. |
| Media | FFPROBE_PATH | optional | no | no | Optional or feature-dependent. |
| Media | MEDIA_UPLOAD_MAX_FULL_SONG_BYTES | optional | no | no | Optional or feature-dependent. |
| Feature Flags | MEDIA_INTAKE_ENABLED | optional | no | no | Optional or feature-dependent. |
| Feature Flags | FEATURE_ADMIN_ENABLED | optional | no | no | Optional or feature-dependent. |
| Feature Flags | PUBLIC_API_ENABLED | optional | no | no | Optional or feature-dependent. |
| Feature Flags | PUBLIC_API_SEED_FALLBACK_ENABLED | optional | no | no | Optional or feature-dependent. |
| Observability | MONITORING_ENABLED | optional | no | no | Optional or feature-dependent. |
| Observability | MONITORING_DSN | optional | no | yes | Optional or feature-dependent. |
| Observability | LOG_FORMAT | configured | no | no | Configured. |
| Observability | LOG_REDACT_FIELDS | optional | no | no | Optional or feature-dependent. |
| Export/Import | EXPORT_IMPORT_ENABLED | optional | no | no | Optional or feature-dependent. |
| Feature Flags | BILLING_ENABLED | optional | no | no | Optional or feature-dependent. |
