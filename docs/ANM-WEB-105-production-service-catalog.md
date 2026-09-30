# ANM-WEB-105 Production Service Catalog

| Service | Criticality | Dependencies | Health | Metrics | Runbook |
|---|---:|---|---|---|---|
| Public client | Critical | Public API, CDN, consent | Public synthetic | Web vitals, route errors | ANM-WEB-097 |
| Admin client | High | Admin API, auth | Admin synthetic | render/auth failures | ANM-WEB-085 |
| API | Critical | MongoDB, Redis, storage | `/health/ready` | HTTP, dependency latency | ANM-WEB-103 |
| Media worker | High | Redis, MongoDB, storage, tools | worker health | queue/job duration | ANM-WEB-088 |
| Publication worker | Critical | Redis, MongoDB, storage, CDN | publication health | stage duration/failures | ANM-WEB-095 |
| Email worker | Medium | Redis, email provider | forms/email health | delivery latency/failure | ANM-WEB-100 |
| MongoDB | Critical | provider | database health | query/connection metrics | ANM-WEB-086 |
| Redis | High | provider | worker/cache health | queue/cache/rate-limit metrics | ANM-WEB-088 |
| Object storage | Critical | provider | storage health | errors/promotion/privacy | ANM-WEB-087 |
| CDN | High | storage/origin | CDN health | range/cache/invalidation | ANM-WEB-087 |
| Search | High | Mongo/search docs/cache | search verifier | latency/errors | ANM-WEB-099 |
| Forms | Medium | DB, Redis, email, challenge | forms health | acceptance/delivery | ANM-WEB-100 |
| Analytics | Low | consent/provider | analytics health | consent-gated events | ANM-WEB-101 |
| SEO | Medium | public metadata/content | SEO gate | sitemap/metadata checks | ANM-WEB-104 |
| Security | Critical | auth/config/public safety | security gate | findings/events | ANM-WEB-102 |
| Deployment | Critical | hosting/DNS/TLS/backups | deployment gate | releases/rollback | ANM-WEB-103 |
| Monitoring | High | selected provider | observability health | ingestion/alerts | ANM-WEB-105 |
