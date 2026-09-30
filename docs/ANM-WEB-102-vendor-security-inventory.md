# ANM-WEB-102 Vendor Security Inventory

| Vendor class | Data handled | Credential type | Security review item |
|---|---|---|---|
| Hosting/deployment | App/runtime logs | Deployment secret | Environment isolation, approvals, rollback |
| MongoDB | All persisted records | DB URI/user | TLS, network allowlist, least privilege, backups |
| Redis | Cache/queues/rate limits | Redis URI/ACL | TLS/auth, namespace, memory policy |
| Object storage/CDN | Public/private media | IAM keys | Public/private prefix isolation, origin access |
| Email provider | Emails, templates, delivery metadata | API/SMTP key | SPF/DKIM/DMARC, webhook signatures |
| Analytics provider | Optional minimized events | Public ID/server key | Consent gating, no secrets in client |
| CI/CD | Source/artifacts/deploy | CI secrets | Minimal permissions, protected envs |
| DNS/domain | Domain records | Registrar/DNS creds | MFA, DNSSEC readiness, incident contact |

DPA/subprocessor/legal review remains outside this technical implementation.
