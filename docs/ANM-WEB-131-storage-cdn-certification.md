# Storage / CDN Certification

Prompt: ANM-WEB-131
Generated: 2026-08-11T15:58:29.444Z
Decision: INFRASTRUCTURE BLOCKED

## Storage - FAIL - infra.storage.production_provider

Object storage upload/download/private-master policy is not verified for production.

Evidence:

```json
{
  "provider": "local",
  "bucketConfigured": true,
  "publicPrefix": "public",
  "privatePrefix": "private"
}
```

## CDN - FAIL - infra.cdn.production

CDN origin, TLS, cache policy, range requests, and invalidation are not verified.

Evidence:

```json
{
  "enabled": false,
  "provider": "none",
  "baseUrlConfigured": false,
  "invalidationEnabled": false
}
```
