# ANM-WEB-105 Service Dependency Map

```mermaid
flowchart TD
  PublicClient["Public Client"] --> PublicAPI["Public API"]
  PublicClient --> CDN["CDN"]
  AdminClient["Admin Client"] --> AdminAPI["Admin API"]
  PublicAPI --> MongoDB["MongoDB"]
  PublicAPI --> Redis["Redis Cache/Rate Limit"]
  AdminAPI --> MongoDB
  AdminAPI --> Redis
  AdminAPI --> Storage["Object Storage"]
  MediaWorker["Media Worker"] --> Redis
  MediaWorker --> MongoDB
  MediaWorker --> Storage
  PublicationWorker["Publication Worker"] --> Redis
  PublicationWorker --> MongoDB
  PublicationWorker --> Storage
  PublicationWorker --> CDN
  Forms["Forms"] --> MongoDB
  Forms --> Redis
  Forms --> EmailProvider["Email Provider"]
  SEO["SEO/Sitemap"] --> PublicAPI
  Observability["Observability"] --> MonitoringProvider["Monitoring Provider"]
```

Critical dependencies: MongoDB, API runtime, public storage/CDN for public media, deployment/runtime configuration, and security controls.

Degradable dependencies: analytics provider, email delivery, optional CDN invalidation, SEO indexing.

Cascading risks: database outage impacts API/admin/publication; Redis outage impacts workers/queues/rate limits; storage/CDN outage impacts public media and publication; monitoring outage reduces detection but must not expose private data.
