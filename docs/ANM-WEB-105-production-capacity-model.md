# ANM-WEB-105 Production Capacity Model

All capacity values below are launch assumptions until staging load tests produce measured limits.

| Area | Current Evidence | Safe Threshold | Scale Trigger | Blocker |
|---|---|---|---|---|
| Public API | Local build/smoke only | P95 under documented baseline | sustained latency/error burn | staging load missing |
| Public client | Production build exists | bundle and web vitals within baseline | LCP/INP regression | browser lab missing |
| Audio previews | local verifier only | range playback synthetic passes | CDN/range failure | live CDN evidence missing |
| MongoDB | local/optional provider health | connection saturation under threshold | pool pressure/slow query spike | production provider evidence missing |
| Redis/queues | local queue health | oldest job age below threshold | backlog/heartbeat alert | production Redis evidence missing |
| Media workers | local worker health | bounded concurrency | queue wait or CPU pressure | deployed worker evidence missing |
| Storage/CDN | local health/reconcile | no privacy violations | public-object miss/error spike | live provider evidence missing |
| Email/forms | local forms verifier | provider latency and delivery pass | queue/dead-letter spike | provider inbox test missing |
| Monitoring | local service checks | metrics/logs/errors/traces ingest | ingestion failure | provider delivery unverified |

Production load tests must be read-only, explicitly approved, and tagged as synthetic traffic.
