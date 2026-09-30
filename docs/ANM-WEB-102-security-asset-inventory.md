# ANM-WEB-102 Security Asset Inventory

| Asset | Owner | Sensitivity | Storage | Access paths | Authorized roles | Existing controls | Exposure impact |
|---|---|---|---|---|---|---|---|
| Public website | Product/Engineering | Public | CDN/static host | Browser | Visitors | Public DTOs, metadata safety, CSP | Defacement or misleading public content |
| Admin portal | Engineering/Ops | Confidential | Static app + admin API | `/admin/*`, `/api/admin/*` | Admin roles by permission | Auth sessions, RBAC, secure cookies | Unauthorized content/media changes |
| Artist/release/gallery/site data | Content Ops | Public after publication, Internal as draft | MongoDB/local JSON fallback | Admin APIs, public projections | Content admins | Publication workflow, public mappers | Draft leakage or incorrect public state |
| Contact submissions | Support/Ops | Confidential | `contact_submissions` | Admin forms APIs | `contact.read/update/delete` | Validation, honeypot, idempotency, admin auth | Personal data exposure |
| Newsletter subscriptions | Marketing/Ops | Confidential | `newsletter_subscriptions` | Admin forms APIs, public token links | `newsletter.read/manage` | Token hashes, confirmation/unsubscribe flow | Email list exposure |
| Consent records | Privacy/Ops | Confidential | `visitor_consents` | Public consent APIs, security health | Public visitors, security admins | Server timestamps, no raw IP storage | Preference/audit integrity loss |
| Analytics events | Product/Ops | Confidential | `analytics_events` | First-party endpoint, admin health | `analytics.read`, security admins | Consent gating, event allowlist, minimization | Behavioral data exposure |
| Audit records | Security/Ops | Confidential | `admin_audit_events` | Admin audit APIs | `audit.read/export` | Snapshot sanitization | Repudiation, forensic loss |
| Full-song masters | Content/Ops | Restricted | Private object storage | Admin signed access only | media high-risk permissions | Full-song privacy verifier, no public DTO | Critical private asset leak |
| Private media | Content/Ops | Restricted | Private object storage | Admin signed access only | media permissions | Short signed URLs, private prefixes | Unpublished/private media leak |
| Public derivatives | Product/Ops | Public | Public storage/CDN | Public APIs/pages | Visitors | Publication promotion allowlist | Broken public media or cache poisoning |
| MongoDB | Engineering/Ops | Restricted | Managed/self-hosted MongoDB | Backend only | Service account | Config validation, indexes | Data breach/tampering |
| Redis/BullMQ | Engineering/Ops | Restricted | Redis | API/workers only | Service accounts | Prefixes, production Redis required | Queue/cache tampering |
| Email provider | Ops | Confidential | External provider | Backend email service | Email service only | Server-side credentials, delivery records | Phishing, data leakage |
| Analytics provider | Product/Ops | Confidential | External provider | Consent-gated adapter | Analytics service only | Provider disabled by default | Tracking without consent |
| Runtime secrets | Engineering/Ops | Restricted | Environment/secret manager | Backend/CI | Ops | Config redaction, strict production checks | Credential compromise |
| Logs/backups | Ops/Security | Confidential/Restricted | Provider/log store/backups | Ops tools | Ops/security | Redaction policy, incident docs | Persistence of leaked data |

Retention and backup expectations are documented per subsystem in prior implementation summaries and require final provider-specific confirmation during ANM-WEB-103.
