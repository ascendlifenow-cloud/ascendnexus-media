# ANM-WEB-103 DNS Plan

Exact DNS values are provider-owned and must not be committed with secrets.

| Record | Purpose | Environment | Verification |
| --- | --- | --- | --- |
| A/AAAA or ALIAS apex | Public website | production | `npm run deployment:dns-verify -- --hostname=<domain>` |
| CNAME `www` | Redirect or canonical public host | production | DNS lookup and browser redirect |
| CNAME/API record | API routing when split | production/staging | API health over HTTPS |
| CNAME media | CDN public assets | production/staging | CDN asset and range request |
| TXT provider verification | Hosting/email/domain proof | per provider | Provider console |
| MX | Inbound/support email if used | production | Provider console |
| SPF TXT | Email authentication | production | `deployment:email-domain-verify` evidence |
| DKIM TXT/CNAME | Email authentication | production | Provider console |
| DMARC TXT | Domain policy | production | DNS lookup/provider report |
| CAA | Certificate authority restriction | production/staging | DNS lookup |
| ACME validation | TLS automation | production/staging | TLS provider |

Registrar and DNS-provider accounts require MFA, auto-renewal, stale-record review, dangling-CNAME checks, DNSSEC readiness review, and least-privilege API tokens.
