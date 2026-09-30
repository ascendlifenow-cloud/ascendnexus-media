# ANM-WEB-102 Data Classification

| Class | Examples | Storage | Transmission | Logging | Export |
|---|---|---|---|---|---|
| Public | Published artist/release/gallery/site data, public media derivatives | Public DB projection/CDN | HTTPS | Allowed when non-sensitive | Allowed |
| Internal | Non-sensitive config, aggregate health, deployment metadata | Backend DB/logs | HTTPS/admin only | Allowed with redaction | Bounded admin export |
| Confidential | Contact submissions, newsletter records, analytics event details, consent records, admin identities | Backend DB only | HTTPS/admin only | Minimized/redacted | Permissioned/audited |
| Restricted | Password hashes, sessions, reset/confirmation token hashes, secrets, private media, full-song masters, recovery codes | Secret manager/private DB/private storage | HTTPS/TLS backend only | Never log raw values | No routine export |

Handling rules:

- Restricted data must never appear in public APIs, public bundles, public caches, analytics payloads, metadata, or structured data.
- Confidential data requires backend permission checks and no public caching.
- Public data must still pass public response safety scans before delivery.
- Exports require explicit permission, size/date bounds, CSV-injection protection, and audit evidence.
