# Published content refresh — 2026-11-08

## Verified staging state

There are 113 fully published releases. Read-only comparison of the deployed guest
catalog against database publication settings matched all 111 guest-eligible
releases. Two published releases remain excluded by audience/artist eligibility.
All 111 guest records include cover and preview references; six sampled artwork
HEAD requests returned HTTP 200 with image MIME types. Landing returns 12 recent
records that satisfy Homepage and New Releases selections. Full catalog pagination
was checked, not just its first page.

Source evaluation shows both active verified VIP accounts eligible for all 113
published songs. This is not an authenticated member browser test or proof of full
audio playback. The existing deployed protected-delivery blocker remains separate.

## Refresh behavior

Publishing and related admin changes invalidate affected public and member query
caches and broadcast a content-free timestamp to other tabs. Visible pages refresh
in the background every 60 seconds and refresh stale data on focus/reconnect.
Existing content remains visible during a normal refresh; no full-page reload is
used. Hidden tabs defer refresh. Authentication changes cancel and evict member
catalog/detail queries. Public HTTP reads revalidate cached responses.

## Approved storage repair

The audit identified 19 selected full-song WAV objects with public metadata and
confirmed public HEAD responses of 200/audio. With explicit owner approval, all
19 were copied server-side to private storage, ETag and length verified, references
updated transactionally, and old public objects retired and confirmed unavailable.
Dedicated previews were untouched. A second idempotent completion pass persisted
the scoped audit entry. Recovery evidence is ignored/private, never committed.

Post-repair audit: 113 selected full-audio references, 113 ready private storage
records, zero public full-song records. Existing memberships and publication
destinations were not changed. Previously downloaded/cached bytes cannot be recalled.

## Prevention and tests

Promotion now checks full-song assignments, links, protected stream requirements
and storage aliases regardless of a custom_audio label or force flag. Dedicated
preview derivatives remain promotable. Strict release readiness blocks already
public selected full-song storage; draft saves retain corrective warnings.

Tests cover cross-tab refresh, hidden tabs, no loading flicker, auth cleanup,
protected-reference promotion, strict readiness and preview preservation.
`staging:published-content-verify` is read-only, prints counts/statuses rather than
URLs or member details, and verifies guest pagination and landing placement.
Payment rollout remains paused; no live charges were enabled.
