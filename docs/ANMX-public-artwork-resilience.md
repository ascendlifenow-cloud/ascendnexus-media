# Public Experience and Artwork Collage Verification

## Changes

- Public JSON reads have a 15-second timeout, including body consumption. Existing React Query retry behavior and production fail-closed behavior remain unchanged; production does not substitute seed content.
- Landing failures offer an explicit retry action.
- Public/member route rendering errors now have an application recovery boundary. A stale deployment chunk produces an explicit reload action rather than a blank root; there is no automatic reload that could discard unsaved work.
- Public/member collages retain available catalog sources when an optional source fails, display a partial-availability notice, and allow retry. Total source failure remains an error.
- Collage image retry timers are cleared on source replacement/unmount.
- Song-cover and artist-profile images retry a transient failure once, then use an approved original when supplied before displaying a placeholder. URLs are not rewritten or promoted.
- Admin collages exclude archived/soft-deleted assets and resolve secure previews only near the viewport. Preview request rejection is contained to the affected tile.
- The shared public-safe member collage is explicitly noindex. Member/admin authentication and preview authorization remain unchanged.

## Verification

Staging checks on October 27, 2026 (Denver):

- Readiness endpoint: HTTP 200, ready.
- Public landing: HTTP 200, approximately 0.4 seconds in the sampled request.
- Public catalogs: 8 artists, 36 releases, 0 gallery items. These are public API counts, not total administrative catalog counts.
- All 100 unique published staging artwork/preview references returned HTTP 200 on read-only HEAD checks. This checks availability, not semantic artwork correctness or full audio playback.
- Browser: public landing rendered real catalog text; collage displayed actual cover/profile artwork. Some landing images initially fell back despite available source files, motivating bounded image recovery.
- `node --import tsx scripts/public-artwork-resilience-test.ts`: passed partial-source, total-source-failure, HTTP failure, optional 404, success, and timeout checks.
- Typecheck and production build passed. Existing Vite chunk-size and dependency directive warnings remain.
- Deployed image recovery verified in the browser: hero and visible song covers loaded actual 1254-pixel artwork after retry instead of placeholders.
- Authenticated member collage rendered actual covers; visible images had nonzero natural dimensions, no horizontal overflow in the sampled viewport, and `noindex,nofollow` metadata.
- Authenticated admin collage loaded; this exposed failed previews for published images using legacy signed-storage delivery. Approved public-safe previews are now preferred before signing, while private/full-song restrictions remain in force.
- A stale `MemberRouteGuard` dynamic import was reproduced across a staging deployment. Direct navigation with the current bundle restored the member page. `TSX_TSCONFIG_PATH=tsconfig.app.json node --import tsx scripts/application-recovery-test.tsx` verifies deployment-error classification, recovery rendering and sensitive-message redaction.

## Boundaries and Follow-up

No membership, publication, gallery visibility, media records, or storage permissions were changed. Empty public galleries are not populated by publishing private media automatically.

Signed-in member/admin checks used interactive sessions provided by the user, not fabricated sessions. Browser artwork availability does not establish that every image is semantically the correct artist/song artwork. The site configuration also currently contains a legacy smoke-test site title, which is separate from media delivery. Three historical unassigned artwork sources were already known unavailable; the admin collage must show an honest unavailable state for genuinely missing originals rather than publish substitutes.
