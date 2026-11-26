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
| P1 security | Dependency remediation: local migration tested November 26 | Router DOM 7.18.7 clears the remaining advisories; audit reports zero known vulnerabilities. Migration regression and build pass; deployment/browser acceptance tracked separately below |
| P1 verification | Account/member/admin browser acceptance: open | Registration, verification/resend, recovery, session restore/revoke, profile/preferences, admin login/navigation, upload/assign/publish/delete synchronization; isolated disposable fixtures only |
| P1 security | Deployed storage/cache/upload assurance: unverified this pass | Confirm private origin denial, all full-song object classifications, scanner policy, service-worker exclusion, protected no-store, log/analytics redaction and preview duration/format across catalog |
| P1 UX/performance | Bundle split tested November 26; latency acceptance open | Admin/page code deferred; initial JS reduced about 66% raw / 60% gzip. Image optimization, measured device/API latency and signed-in acceptance remain open; see follow-up |
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

## November 25 Dependency Follow-Up

Applied reviewed compatible updates without `--force` or package lifecycle scripts.
Raised manifest minimums for React Router DOM 6.30.6, Vite 7.3.8 and PostCSS 8.5.33.
The lockfile also updates @remix-run/router 1.23.4, baseline-browser-mapping 2.11.39,
browserslist 4.29.6, nanoid 3.3.20, source-map-js 1.2.4 and associated browser/CSS
metadata dependencies. React, MongoDB, Stripe and application behavior are unchanged.

Validation rerun on November 25: all 42 distinct regression suites listed above
pass with isolated fixtures, as do public structural QA and the production build.
Clean-install dry run confirms manifest/lockfile consistency. These results do not
replace signed-in browser/audio acceptance. The existing large-entry-chunk warning
remains; no performance or billing completion is claimed.

The audit is **not clean**: two moderate package entries remain for react-router
and its dependent react-router-dom. The published router advisories identify
7.18.0 as patched; npm proposes a major migration rather than a compatible fix.
Do not use forced upgrades, suppress the findings, or mark this item complete.

- [Backslash navigation advisory](https://github.com/advisories/GHSA-wrjc-x8rr-h8h6):
  keep open for migration and untrusted navigation review.
- [SSR hydration advisory](https://github.com/advisories/GHSA-337j-9hxr-rhxg): the
  maintainer excludes Declarative Mode. This app uses BrowserRouter/createRoot;
  no manual SSR/hydration usage was found in src/server. This applicability review
  is not removal of the vulnerable package or blanket security certification.

Next: a separately tested router migration, including member/admin redirects,
nested routes, direct refresh, logout, external-link handling and staging browser
acceptance. Payment activation remains deferred.

## November 26 Router Migration

Updated react-router-dom/react-router to 7.18.7, retaining BrowserRouter and the
existing declarative Routes structure. Node 20 and React 18 satisfy the published
package requirements. No framework-mode, SSR or authentication-platform replacement
was introduced. Existing absolute admin/member links and nested layout routes remain.

Added a shared member return-path validator to the login and member guard. It accepts
only normalized /member routes, rejects prefix lookalikes, external origins,
backslashes, escaped separators, malformed escapes and control characters, and falls
back safely without changing account permissions. Valid query/fragment context is
retained. Updated the admin navigation test's removed server subpath import to the
v7 root export.

All 42 previous suites pass after correcting that import; the new router migration
test also passes, for 43 distinct passing suites. The new test extracts real route
declarations from AppRouter and uses installed router matching/navigation to cover
public/member/admin routes, aliases, nesting, guard placement and safe return paths.
It does not execute authenticated guard effects or claim browser/audio acceptance.
Production build and public structural QA pass. Dependency audit reports zero known
vulnerabilities at this check, not a guarantee of application security. Large bundle
warning remains. User-provided signed-in Opera is available for bounded read-only
post-deploy acceptance; no membership, publication or payment changes are authorized
by this migration.

Reference: [official router changelog](https://reactrouter.com/changelog), including
v7 minimum versions, compatibility re-exports and adopted future-flag behavior.

## November 26 Loading and Bundle Follow-Up

Confirmed the eager guest/member bootstrap included every admin page. Moved the
unchanged admin route declarations into deferred AdminAppRoutes and made all 59
admin page entries individually lazy. Permission wrappers and admin/member session
boundaries remain; no API authorization or server/session configuration changed.
An inner route-body Suspense boundary preserves admin navigation while the requested
page bundle loads, with a pathname key to avoid stale prior-page content.

The public/member transition wrapper now keys only by pathname, not query string.
Filter/query changes no longer force a full member session/layout remount. Page
changes still trigger the existing account revalidation. Further decoupling of
member shell hydration requires dedicated lifecycle/security coverage and remains
open. Removed zero-opacity route animation frames so a paused animation cannot hide
otherwise loaded content; reduced-motion behavior is unchanged.

Measured using Vite's build manifest and the transitive static JavaScript imports of
the HTML entry (dynamic page chunks, CSS, images and network latency excluded):

| Measure | Before | After, approximately |
| --- | --- | --- |
| Entry JavaScript | 1,274,768 bytes | 260,638 bytes |
| Static bootstrap JavaScript | 1,530,309 bytes | 516,179 bytes |
| Sum of gzip sizes of static JavaScript | 386,161 bytes | 153,577 bytes |
| Deferred admin page entries | 0 | 59 |

This is roughly 80% less entry JS, 66% less static bootstrap JS and 60% less gzip
bootstrap JS. It is not a 66% page-load latency claim. The build's >500 kB chunk
warning no longer appears. Large image assets and backend latency are not fixed by
this change.

All 43 prior distinct suites and the new route-loading suite pass (44 total).
The router test now reads actual declarations from both route files. Loading tests
check query-key stability, retained pathname revalidation, a local admin loading
boundary, visible animation frames, actual deferred build entries and budgets of
400 KB entry / 700 KB static bootstrap JS. These are component-structure and build
regressions, not full signed-in lifecycle or audible playback certification.
Production build and public structural QA pass. Staging revision checks and browser
acceptance must confirm deployment before claiming the improvement is live.
Payments remain paused; no members, media, publications or billing records changed.
