# ANM-WEB-096 Public Delivery Operations Runbook

## Public API Unavailable

Check `/api/public/health`, then authenticated `/api/admin/system/public-delivery/health`. Confirm public delivery is enabled, persistence is reachable, and public routes are not returning safety violations.

## Redis Or Cache Outage

The current runtime safely bypasses cache and reads authoritative public data. Health will show degraded cache state when Redis integration is unavailable in production. Do not enable seed fallback in production.

## Stale Content

Run `npm run public-api:verify` and inspect `PublishedContentSyncStatus`. Republish or invalidate the affected entity tag. For hidden content, confirm a tombstone exists and the old detail URL returns not found.

## Unpublished Content Still Visible

Treat as urgent. Verify the entity publication state, cache invalidation, and tombstone behavior. The public response safety scanner does not replace visibility checks; both must pass.

## Full-Song Or Private Exposure

Stop publication, capture the endpoint and operation ID, and inspect the public mapper. Full-song data must not appear in public release APIs, metadata, structured data, search, browse, or homepage sections.

## Incorrect Public Version

Check the latest publication operation, sync status, and cache metrics. If rollback was used, confirm the public API response ETag changed and the previous verified version is active.

## Missing Public Media

Check the published site fallback assets and entity media fields. Fallbacks may appear for optional media but must not hide required-media publication failures.

## ETag Issue

Compare two identical GET responses. ETags should remain stable across volatile `generatedAt` changes and return `304` when `If-None-Match` matches.

## CORS Issue

Public APIs support anonymous GET/OPTIONS. Do not require admin cookies or credentials for public delivery.

## High Latency Or Low Cache Hit Rate

Use `/api/admin/public-delivery/cache/metrics`. If misses are high after publication, warm critical routes after confirming all payloads are public-safe.

## Emergency Cache Purge

Use publication invalidation first. If needed, clear public cache through service-level operations and verify hidden content remains absent before traffic is restored.

## Post-Publication Verification

Run:

```bash
npm run public-api:verify
npm run test:public-delivery
```

Then spot-check the live client pages that consume the affected endpoints.
