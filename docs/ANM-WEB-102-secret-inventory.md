# ANM-WEB-102 Secret Inventory

No secret values are documented here.

| Secret key | Purpose | Consumer | Rotation method | Exposure impact |
|---|---|---|---|---|
| `MONGODB_URI` | Database connection | API/workers | Provider credential rotation + deploy env update | Full database compromise |
| `REDIS_URL` | Cache/queue/rate-limit connection | API/workers | Redis ACL/password rotation | Queue/cache/session disruption |
| `AUTH_SESSION_SECRET` | Session signing/hash material | API | Rotate with session revocation | Admin session compromise |
| `AUTH_ACCESS_TOKEN_SECRET` / `AUTH_REFRESH_TOKEN_SECRET` | Token readiness | API | Rotate and revoke tokens | Auth bypass risk |
| `MEDIA_STORAGE_ACCESS_KEY_ID` / `MEDIA_STORAGE_SECRET_ACCESS_KEY` | Object storage | API/workers | IAM key rotation | Media exposure/tampering |
| `EMAIL_API_KEY` / SMTP credentials | Email delivery | API/email worker | Provider key rotation | Email abuse/phishing |
| `ANALYTICS_API_SECRET` | Analytics server-side provider | API only | Provider key rotation | Event tampering/leak |
| Webhook secrets | Provider webhook validation | API | Provider secret rotation | Forged webhook events |
| CI/CD deployment credentials | Deployment | CI | CI secret rotation | Supply-chain/deployment compromise |

Production requirements: store in a secret manager or protected deployment environment, never in `VITE_*`, never in docs/logs/build artifacts, and rotate after suspected exposure.
