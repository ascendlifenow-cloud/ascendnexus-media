# ANM-WEB-113 Protected Content Operations Runbook

## Protected Stream Unavailable

Run `npm run protected-content:health` and `npm run protected-content:authorization-test`. Confirm the member is active, verified, assigned to a tier with `audio.stream.full`, and the private storage object is ready.

## Range Request Failure

Run `npm run protected-content:range-test`. Check `Accept-Ranges`, `Content-Range`, `Content-Length`, MIME type, and gateway logs. Invalid or multi-range requests should be rejected safely.

## Download Replay

Run `npm run protected-content:download-test`. Downloads require `audio.download`; streaming entitlement is insufficient. Replay should fail after max use.

## Protected Content In Public Cache/Search/SEO

Immediately run:

- `npm run protected-content:cache-scan`
- `npm run protected-content:search-scan`
- `npm run protected-content:seo-scan`
- `npm run protected-content:full-song-scan`
- `npm run protected-content:private-media-scan`

Apply takedown or emergency deny if any protected value appears publicly.

## Full-Song Or Private-Media Exposure

Treat as Critical. Revoke active authorizations, disable the affected resource, purge caches, remove public/search/SEO projections, preserve evidence, and open a security incident.

## Takedown

Use the admin protected-content takedown API/page with a reason. The flow blocks protected resources, revokes active authorizations, marks playback sessions revoked, and records the action.

## Restore Delivery

Restore only after policy, storage, publication, and public-projection scans pass. Re-run the protected-content verification suite.

## Verification Commands

The `protected-content:*` commands redact sensitive delivery values and return non-zero on blockers.
