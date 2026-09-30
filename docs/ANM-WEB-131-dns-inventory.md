# DNS Inventory

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

No provider secrets or token values are included.

| Purpose | Host | Record Type | Target | Status | TTL | Provider |
| --- | --- | --- | --- | --- | --- | --- |
| Public web | pending | A/AAAA/CNAME | deployment platform target | pending external verification | provider configured | production DNS provider |
| Admin path | pending | same as web or separate host | admin route host | pending external verification | provider configured | production DNS provider |
| API | pending | A/AAAA/CNAME | API deployment target | pending external verification | provider configured | production DNS provider |
| CDN/media | pending | CNAME | CDN/provider target | pending external verification | provider configured | CDN provider |
| Email SPF/DKIM/DMARC | pending | TXT/CNAME | email provider records | pending provider verification | provider configured | DNS/email provider |
