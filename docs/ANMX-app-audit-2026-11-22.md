# Application Audit and Completion Backlog

Date: 2026-11-22, America/Denver.

## Decision

Continue staging development and acceptance testing. This pass is not certification
that every route works, that every media byte is safe, or that paid launch is ready.
Payments remain paused pending functional acceptance. No account, membership,
publication, stored media, billing setting or production environment was changed.
Unrelated `output/` files were left untouched.

## Evidence From This Pass

| Area | Result | Boundary |
| --- | --- | --- |
| Public landing | Loads in staging browser with release and artist sections | Duplicate latest/preview presentation and smoke-test site title need editorial cleanup |
| Songs catalog | Loads; searching Nova returns 14 matching releases without replacing the whole catalog with a loader | Not a measured latency budget or all-device acceptance |
| Staging catalog reconciliation | 113 published records; 111 guest-eligible and 111 returned; mixes 43/24/44; 12 landing latest items obey placement | Two restricted/artist-ineligible releases correctly excluded; no publication changes |
| Artwork references | All 111 guest songs have cover and preview references; six sampled cover HEAD requests return image/200 | References and samples do not prove every image or audible preview |
| Public artwork collage | Images render at desktop and 375px; visible mobile images loaded and no horizontal overflow | Admin/member signed-in checks await a shared signed-in browser |
| API access boundary | Read-only staging readiness and anonymous member/admin denials pass at baseline c03fa3d | Anonymous sample, not authenticated full-stream certification |
| Automated regression coverage | 42 distinct suites pass, plus public structural QA and TypeScript/production build | Most lifecycle tests use isolated data or mocked transports; not end-to-end browser coverage |
| Dependency audit | 9 reported vulnerable packages: 5 high, 4 moderate; none critical | Dependency advisory counts are not proof of exploitable deployed paths; no blind upgrades applied |
| Signed-in acceptance | Not completed in this pass | User offered sign-in; only the guest test tab was available when inventoried |

## Fixes Delivered in This Change

1. Filter explicit operational style labels (`recovered`, `media-intake`, `draft`,
   `archived`) in public release/artist projections and the member song catalog.
   Genuine styles remain; source/admin records are not rewritten. Search and browse
   consume these projected releases. A new regression checks normalized labels,
   nonmutation, published-only mapping and legitimate style preservation; the member
   catalog integration test verifies the same behavior for authorized songs.
2. Exclude reserved example.com/example.org/example.net destinations, including
   subdomains, from footer social links. Do not invent replacement destinations.
3. Fix public/member collage Back-button anchoring. Browser inspection reproduced a
   fixed button at y=7354 in an 812px viewport, trapped by the animated route ancestor.
   A body portal escapes that containing block. Admin collage uses the same portal
   for its full-screen root; admin browser acceptance remains required.
4. Repair obsolete public structural checks to follow the current shell components.
   Do not ban every media `load()` call: unloading revoked sources requires it.
   Check declarative autoplay instead, allowing explicit `autoPlay={false}`.
   This remains a structural guard, not a substitute for playback lifecycle tests.

## Test Record

The 32 baseline suites cover build identity, mix actions/grouping, song actions,
playlist lifecycle/idempotency, download button, storage reads, member selection,
media client routing, session activity, admin navigation, publication freshness,
promotion safety, full-song readiness, publication targets/enforcement/editor,
member catalog, streaming queue, storage diagnostics, delivery health, staging
test safety, effective tiers, deployment identity, permission smoke, song
permissions, agent status/operator safety, media reconciliation, catalog policy
and Stripe billing. Stripe tests made no real requests or charges.

Six further scripts pass: admin cross-tab logout, admin session races, review
refresh, assignment rollback, badge counts and review-hook ordering. New consumer
discovery and viewport-portal tests pass. Public API verification and security
verification pass using isolated temporary local servers/data. Four initial
listener EPERM failures were rerun with permission and passed. Public structural
QA initially failed its obsolete assumptions; it passes after the scoped repair.

The security fixture warns about secure cookies and an unconfigured virus scanner
in its local test environment. These warnings are not evidence that staging cookies
or scanning have been inspected; verify actual deployed configuration separately.

Build output: main JavaScript approximately 1,274.71 kB raw / 303.51 kB gzip.
The large-chunk warning remains. No Lighthouse or full WCAG certification was run.

## Prioritized Remaining Work

| Priority | Item / Status | Completion Evidence Required |
| --- | --- | --- |
| P0 before charging | Signed-in acceptance matrix: open | Guest preview; Free allowance/exhaustion; Premium/Supporter/VIP full playback; seek/refresh; separate download; logout/downgrade/suspension; cross-member denial, desktop and mobile, with actual browser/audio evidence |
| P1 security | Dependency remediation: confirmed open | Review and patch React Router/DOM, Vite, PostCSS and affected transitive packages; repeat build, redirects/auth and regression suites. Audit reports baseline-browser-mapping, browserslist, nanoid and source-map-js too |
| P1 verification | Account/member/admin browser acceptance: open | Registration, verification/resend, recovery, session restore/revoke, profile/preferences, admin login/navigation, upload/assign/publish/delete synchronization; isolated disposable fixtures only |
| P1 security | Deployed storage/cache/upload assurance: unverified this pass | Confirm private origin denial, all full-song object classifications, scanner policy, service-worker exclusion, protected no-store, log/analytics redaction and preview duration/format across catalog |
| P1 UX/performance | Heavy entry bundle: confirmed open | Split eager admin/editor code from guest entry and optimize large fallback/hero/emblem images; measure cold/warm mobile route and API latency with budgets |
| P1 data safety | Snapshot migration boundary: partial | Existing changed-record transactions remain; retire remaining broad snapshot reads/full write paths after stale-edit, concurrency, recovery and migration tests; see database-mutation-safety record |
| P1 release automation | Transactional approval executor: incomplete/locked | Validate exact revision-bound approval immediately before public effects; test withdrawal, changed assets/schedule/destinations, retries, deduplication, partial success and rollback |
| P1 operations | Repeatable CI acceptance gate: partial | Wire recent standalone lifecycle tests into CI; add signed-in staging browser fixtures, mobile screenshots, accessibility, network leakage and deploy revision checks. No generic npm test/lint/E2E script currently provides this entire gate |
| P2 content/UX | Guest configuration cleanup: confirmed open | Replace smoke-test site title with owner-approved copy, supply real social links, review empty gallery and duplicate latest/preview sections; no inferred account URLs |
| P2 accessibility | Full keyboard/screen-reader audit: open | Focus order, drawers/dialogs, mobile menus, floating controls, status announcements, forms and contrast; automated plus manual tests |
| P2 creative | First production release: blocked | Approved versioned artist/brand references, actual final recording and audition evidence for The Spare Key Choir, exact-bundle owner approval; prepared documents are not audio |
| P2 integrations | Third-party publishing: blocked | Real destination accounts/API permissions and verified supported adapters; exports are not successful uploads |
| P2 agents | Continuous coordinated execution: planned | Existing persisted task/status records are not a resident agent runner; bounded ownership, safe event reporting and real execution evidence required |
| P2 asset restoration | Previously documented missing originals: recheck | Prior readiness report identifies three missing sources; current count not revalidated, so do not call resolved or replace with unrelated images |
| Deferred | Stripe activation / live payments | Resume only after functional acceptance, then isolated sandbox checkout/webhook/idempotency/refund/reconciliation tests and explicit live authorization |

## Next Bounded Assignment

Complete signed-in staging acceptance and fix demonstrated failures, while reviewing
nonbreaking security dependency updates in a separate scoped change. Do not activate
payments or automatically publish generated songs. Keep code deployment separate
from song-release approval. Use this backlog alongside, not instead of, the existing
ANMX-AGENT-003 readiness and staging-permission records.

## Staging Verification Checklist

- Verify frontend and API both report the new deployed commit; do not infer deploy
  success from a push or from the previous revision's healthy response.
- Verify public songs/landing no longer present the explicit workflow style tags.
- Verify placeholder social destinations are absent and real links still work.
- At 375px and desktop, ensure collage Back stays inside the visible screen, works
  after scrolling, and returns to the prior route. Repeat signed-in member/admin.
- Re-run read-only catalog reconciliation and anonymous authorization checks.
- Complete signed-in acceptance separately; do not mark it passed from mocks.
