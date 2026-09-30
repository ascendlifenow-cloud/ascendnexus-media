# ANM-WEB-102 Attack Surface Inventory

Primary surfaces:

- Public website: `/`, `/artists`, `/songs`, `/gallery`, `/search`, `/browse`, `/contact`, legal pages, newsletter confirm/unsubscribe.
- Public API: `/api/public/*`, including content, search, forms, consent, analytics, metadata.
- Admin auth: `/api/admin/auth/*`.
- Admin CRUD and operations: artists, releases, gallery, media, processing, publication, homepage/site, metadata, forms, users, security.
- Uploads: backend-proxied and direct multipart admin media flows.
- Background workers: media processing, storage, CDN/publication operations, email readiness.
- Object storage/CDN: public derivatives and private source/master media.
- Database/Redis: backend-only persistence/cache/queue dependencies.
- Email and analytics provider APIs.
- CI/CD and deployment interfaces.

Controls by class:

| Surface | Auth | Permission | Validation | CSRF/CORS | Cache | Logging |
|---|---|---|---|---|---|---|
| Public content APIs | No | Public DTO only | Query allowlists, pagination bounds | Non-credentialed CORS | Public ETag/TTL | No private payloads |
| Public forms | No | N/A | Content type, body size, honeypot, consent | Non-credentialed CORS | No-store | Redacted form data |
| Public consent/analytics | No | Consent reference for optional analytics | Event catalog, property allowlist | Non-credentialed CORS | No-store | No PII/raw URL |
| Admin auth | Cookie session | Auth policy | Body validation | Admin origin allowlist | No-store | Auth audit |
| Admin CRUD | Required | Resource permission | Allowlisted service payloads | Admin origin allowlist | No-store | Audit snapshots |
| Media uploads | Required | Media permissions | MIME/signature/size/role policy | Admin origin allowlist | No-store | Sanitized metadata |
| Publication | Required | Publication high-risk permissions | Readiness gates | Admin origin allowlist | No-store | Operation audit |

Machine-readable route coverage is in `ANM-WEB-102-route-security-manifest.json`.
