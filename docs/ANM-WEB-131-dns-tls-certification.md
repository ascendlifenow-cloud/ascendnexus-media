# DNS / TLS Certification

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

## DNS - FAIL - infra.dns.production

External DNS propagation and canonical host verification are not recorded.

Evidence:

```json
{
  "publicAppBaseUrlConfigured": false,
  "apiBaseUrlConfigured": false,
  "adminAppBaseUrlConfigured": false
}
```

## TLS - FAIL - infra.tls.production

TLS certificate chain, hostname, expiry, redirects, and mixed-content checks are not recorded.

Evidence:

```json
{
  "required": [
    "public web",
    "api",
    "admin",
    "cdn/media"
  ]
}
```
