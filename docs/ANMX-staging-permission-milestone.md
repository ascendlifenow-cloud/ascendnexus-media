# Staging permissions milestone

Date: 2026-10-28 (America/Denver).

## Playback Failure Classification and Recovery, 2026-11-17

Rejected play requests preserve the existing safe MediaError classification where available, distinguish browser gesture blocking from unsupported formats, and never display raw exception text or source URLs. Starting a new play attempt and receiving a playing event clear obsolete error messages. Regression tests cover NotAllowedError, NotSupportedError, generic failure, exception-detail suppression and successful retry. Streaming queue, song selection, mix actions and the production build pass locally. These mocked checks do not certify audible playback. Membership permissions, media delivery artifacts and billing activation are unchanged.

## Staging Catalog Acceptance Check, 2026-11-17

Cloudflare reports successful completion for revision `9db0996`; the staging API identifies the same revision and all seven anonymous read-only permission smoke checks pass. The published-content audit found 113 published releases, 111 guest-eligible releases and an exact match between eligible database records and the public API. The three public mixes contain 43, 24 and 44 songs. All 111 have cover and preview references; six sampled covers return HTTP 200 with image content types. Twelve landing-page releases satisfy their configured homepage/new-release placements. No database records were changed.

The deployed guest preview for Our Love Has a Junk Drawer still reports a start failure in the automated browser. A separate header-range request confirmed a 16-bit stereo PCM WAV at 48kHz, HTTP 206, valid Content-Range and cross-origin allowance. These transport checks do not establish successful browser decoding or audible playback, and the root cause remains unresolved. Member playback, automatic next-song transitions and signed-in mobile acceptance were not tested in this run. Billing remains paused. The catalog placement check passes; playback acceptance remains open.

## Playback Promise Isolation, 2026-11-17

The shared player now ignores a rejected play promise after its source operation has been superseded by closing the player or loading another song. Regression tests reproduced the erroneous preview failure before the fix and now verify that both idle and replacement-source state remain intact. Current-operation playback failures still surface normally; authorization and source validation are unchanged.

Local verification covers streaming queue safeguards, member song selection and playlist lifecycle. This resolves a demonstrated stale-error race, not the independently observed automated-browser media decoding/delivery failure. Guest preview decoding and signed-in mobile playback remain unverified. Billing remains paused.

## Responsive Player Spacing Increment, 2026-11-16

The selected-song menu measures its rendered height with ResizeObserver and a window-resize fallback. The floating player and above-menu playlist picker consume the same bottom offset, including device safe-area spacing, rather than assuming a fixed 12rem/48-unit menu. Menu and picker content have viewport-bounded scrolling. The floating player's artwork remains square but is limited to 12rem on narrow screens; tablet/desktop sizing is unchanged. Playlist choices have minimum 44px touch height and wrap long names.

The selected-song regression invokes the real layout effect with mocked element measurements, verifies the offset changes from a 248px panel to a rounded 320px panel and confirms observer/style cleanup. Existing playlist lifecycle and streaming safeguards remain in place. This is a structural layout test, not a signed-in device screenshot or decoder test. Browser viewport checks and staging deployment evidence are reported separately. No playback grants, quotas, billing, catalog or publication changes are included.

## Member Mix Playback Increment, 2026-11-16

Premade member mixes and personal playlist sections now offer three icon controls: Play Mix (replaces the temporary queue), Add Mix to Queue and Remove Mix from Queue. Only distinct release cards currently marked streamable enter bulk additions. Appending does not request a session or authorize media. Playing loads the ordered queue and invokes the existing protected player for the first song only; subsequent songs use the existing on-demand next-song authorization. Denied access is not silently replaced by a preview or skipped through an authorization loop. Removing a mix removes its queue entries, not personal playlist records, and does not stop an already-playing source.

Personal playlists and Continue Listening now project saved references through the current authorized catalog cards. This replaces stale saved metadata and the previous hardcoded nonstreamable flag; unavailable references are omitted rather than returned with an allowed label. Visible playlist counts match projected items. Saved records remain intact, so temporarily unavailable songs may reappear when authorization returns.

Local tests: `test:member-mix-actions`, `test:member-song-catalog`, `test:streaming-queue`, typecheck and production build. Tests cover no authorization on render/append, ordering/deduplication, first-song-only start, duplicate-click protection, scoped queue removal, empty/exhausted mixes and exclusion of stale inaccessible saved references. These are local synthetic/mocked checks, not signed-in mobile or browser-decoder verification. Staging deployment/read-only smoke verification is separate; no existing member playlists, song permissions, billing or publication records are modified by deployment.

## Premade Mixes and Placement Shelf, 2026-11-16

Public and member song catalogs are organized into three premade groups: Nexus Mix 01, 02 and 03. Existing eligible releases receive a deterministic release-ID-based assignment, not a claim of editorial or mood analysis. Each song appears in one group. Admins can override the group through `metadata.publicationPlaylist` (`nexus-01`, `nexus-02`, `nexus-03`, or `auto`). The automatic sentinel explicitly clears a prior choice through the existing metadata merge. Unknown values fail publication validation. Only the safe resolved `playlistKey` enters public/member projections; internal metadata is not copied.

Grouping runs after existing public/member access filtering. No audience, publication state, download right or media-storage setting is changed by automatic grouping. Public listening retains dedicated previews; full songs still require current protected authorization. The public target is at least 50 songs across three nonempty groups, verified by the read-only staging catalog command rather than publishing private drafts to fill a quota. The last verified catalog contained 111 public releases.

Member dashboards receive three premade lists built from the member's authorized song catalog, including member-only songs when permitted, rather than only the eight-item recommendation slice. Personal playlists remain separate. Public/member catalog filters apply across the three groups. Publication controls are condensed into a Where This Appears summary and Edit Placement shelf: minimum audience, Homepage, New Releases and premade playlist. Done closes the shelf; existing draft/save/readiness/Save & Publish controls remain the only persistence/publication flow. Opening the shelf never publishes.

Tests cover deterministic grouping, deduplication, explicit overrides, legacy automatic defaults, malformed settings, metadata round trips, member-only catalog privacy, publication/access enforcement and production build. Staging validation reports mix counts without private URLs. Signed-in admin/mobile visual acceptance remains separate from local tests and anonymous catalog verification. No existing records were bulk-edited and billing remains paused.

## Owner Acceptance and Public Actions, 2026-11-16

Owner confirmed that adding a song produces one playlist entry and signing out clears private content. This is manual acceptance of those two flows, not full mobile, accessibility or production certification. The follow-on public-action correction renders Add to Playlist only under the authenticated member-area context. Guest public pages, signed-in browsing outside that area and admin song previews retain preview/queue/detail actions but do not mount the playlist picker. Existing backend playlist ownership and session checks remain authoritative. Regression test: `test:song-action-area`.

Next bounded milestone remains signed-in mobile player/picker usability, followed by catalog/media-assignment and publication-placement regression checks. Payments remain paused and creative publication remains unapproved.

## Playlist and Account Cleanup Increment, 2026-11-16

The playlist picker now reloads current member-owned lists each time it opens, serializes pending adds, refreshes the member dashboard after a successful save and supports Escape dismissal with an expanded-state announcement. Pending requests and cached playlist names are cleared on same-tab and cross-tab authentication changes, selected-release changes and unmount. Late responses cannot repopulate a cleared picker or trigger another account's dashboard refresh. Engagement responses request no-store caching; playlist requests are bounded and abortable. A failed dashboard refresh does not falsely report that an already-saved song was not added.

Member route hydration now responds to authentication changes by immediately removing private dashboard/session state and revalidating. Dashboard refreshes are generation-bound and ordered; a late response from an earlier account or request cannot replace current content. Authorization failures during refresh discard private state. This is not a new authentication or entitlement engine, and it does not certify all remote revocation or account-version propagation paths.

Server-side playlist adds ignore a repeated resource type/ID within the same member-owned playlist. Existing duplicates are not deleted, reordered or migrated. Synthetic local persistence tests cover concurrent/repeated adds and cross-member rejection; multi-instance Mongo concurrency remains a separate acceptance boundary.

Local evidence: `test:member-playlist-lifecycle`, `test:playlist-idempotency`, `test:streaming-queue`, `test:member-song-selection`, typecheck and production build. Hook lifecycle tests are mocked, not signed-in browser E2E. Staging deployment and signed-in visual verification must be recorded separately. No existing accounts, playlists, songs, billing settings or publication states were changed during local testing.

## Current Milestone Update, 2026-11-15

The older deployed playback blocker below is historical, not the current status. Following owner-approved replacement of the staging API's invalid R2 credential pair on November 13, isolated run `3a7c24b2-838d-487b-be4e-399788b35414` passed all 41 checks on runtime revision `3de5bd8`. Coverage included actual private range bytes for Free/Premium/Supporter/VIP, Free limits, separate single-use downloads, downgrade, suspension, expiration and logout rejection. Test fixtures were cleaned up. The owner subsequently confirmed full playback and preview playback working. This does not certify production or all browser workflows.

Commit `ddb880a` corrected the protected download client's website/API host mismatch, validated gateway-only download endpoints and prevented concurrent authorization clicks. Cloudflare build and Render deployment succeeded; seven anonymous read-only staging checks passed. The component was not yet mounted in the song experience, so this was not browser download acceptance.

The follow-on increment connects the control below the song-detail artwork only when the current server usage summary permits downloading. `POST /api/member/releases/:releaseIdOrSlug/download-authorize` resolves the action-specific asset server-side, rechecks publication and download policy and uses the existing member/session-bound single-use gateway. Client asset IDs, tier values and expiration requests cannot control this selection. The response is private/no-store and noindex. No tier benefits or release download settings are changed by this code increment.

The button authorizes only on click, validates the returned gateway address and expiry, cancels pending results on logout/cross-tab account change/unmount, and prevents concurrent requests. Local button lifecycle, seven-action API routing, synthetic HTTP song-permission tests, streaming regressions, typecheck and build passed. Mocked lifecycle checks are not signed-in browser acceptance. The isolated staging harness now tests the release-based download endpoint rather than the legacy media-ID endpoint; deployed evidence must be recorded separately.

Payments remain paused pending application acceptance. Creative production remains private: The Spare Key Choir still requires real final audio and owner approval of the exact release bundle. No publication or billing activation is authorized by this milestone.

Next acceptance: deploy the connected download increment, run isolated staging download and playback checks, check the member download interaction, then verify the listening-to-playlist workflow and account-change cleanup in a signed-in browser. Preserve separate stream/download authorization and existing working playback.

## Gateway Memory Increment, 2026-10-30

Staging readiness still identifies `281618e`. The protected range acceptance blocker is not considered resolved by a generic ready response.

Independent inspection found that first delivery deep-cloned the entire catalog inside Mongo `update()`, which already retains an original snapshot and its mutable copy. The gateway now validates before allocating accounting copies and independently clones only usage, authorizations and access history. HEAD and already-counted ranges return before that extra staging allocation. Refresh independently stages only authorizations and playback sessions. The outer Mongo conflict checks and transaction remain unchanged; local-cache mutations are still published only after all throwing accounting work succeeds.

Local regression checks pass, including a guard against gateway whole-catalog cloning, first-delivery/range accounting, refresh, membership changes and late accounting failure isolation. A synthetic late failure returns 503 without changing the cached usage ledger or authorization. This reduces redundant copying; it does not establish an out-of-memory diagnosis, measured latency improvement, or a fix for the deployed HTML 502. Broader catalog-wide reads in the legacy database adapter remain a separate scaling limitation.

Render integration discovery succeeded and workspace confirmation is pending before service logs/events are inspected. No Render settings, instance plans, credentials or storage permissions were changed.

## Scope

Make the song-permission increment independently identifiable on staging, align administrative membership presentation with effective access, and establish repeatable safe verification. This is not a live payment launch or song-publication approval.

## Implemented

- Runtime deployment identity accepts Render's documented `RENDER_GIT_COMMIT` after explicit project commit variables. Explicit release IDs remain authoritative. A stale persisted release from another commit cannot make the running revision appear verified. Artifact digest remains unverified unless supplied; a commit ID is not an artifact checksum.
- CRM search, detail, recent registrations and tier counts use the same authoritative entitlement resolver as protected song access. Legacy account classification is preserved, not rewritten, but no longer presented as effective tier. Inactive/unverified accounts show no protected membership access. Existing account status and admin role boundaries remain separate.
- `staging:permissions-verify` is an anonymous, fixed-host, GET-only check with timeouts, response-size bounds, redirect rejection and sanitized JSON output. It verifies staging readiness, identifiable/expected revision, 401 protection for member usage/dashboard/admin members, and a sampled public-release projection. It does not use session cookies, consume plays, create accounts, grant tiers or fetch protected audio bytes. A projection pass is a bounded heuristic, not full-catalog leak certification.

Render source: https://render.com/docs/environment-variables (`RENDER_GIT_COMMIT` is the service/deploy commit SHA, available at runtime).

## Verification Evidence

Before this deployment, staging readiness passed but reported `local-unversioned`. Anonymous song usage, dashboard and admin member requests returned 401. A sampled public release response passed the protected-field scan. The command correctly exited nonzero for the unidentified/mismatched revision rather than claiming deployment success.

The existing signed-in staging admin session loaded the Members list. Its legacy readiness labels visibly differed from the current assignment audit; no member data was changed during this check. Authenticated member playback, paid-account transitions and post-deployment CRM rendering still require browser verification.

Local regression tests cover provider identity precedence, stale persisted release isolation, smoke-check failures/mismatches/leaks, current CRM membership filtering, grants and blocked account states. Synthetic fixtures only; no real member changes.

Independent engineering review (Carson, bounded read-only assignment) found repeated full-member scans in CRM resolution and a missing `fullSongPublicUrl` scan key. Both were corrected: member-specific records are grouped once per CRM query, and the known full-song field has explicit regression coverage. This is static review plus local tests, not a load-test or full security certification.

## Commands

```sh
npm run test:deployment-identity
npm run test:staging-permission-smoke
npm run test:member-crm-effective-tier
npm run staging:permissions-verify -- --environment=staging --expected-commit=<deployed-commit>
npm run typecheck
npm run build
```

## Remaining Acceptance

### Isolated staging run, 2026-10-28

Owner authorized four disposable test members and private synthetic audio. The deployed revision `69443e3` passed the anonymous smoke check. Isolated authenticated tests passed real Free/Premium/Supporter/VIP logins, private detail exclusion, unsigned private-object denial, Free issuance without debit, member binding and HEAD without debit. The configured R2 bucket/public-media mapping matched by ETag and content length. A server-only signed origin range returned the exact 44 expected synthetic WAV header bytes.

The deployed gateway range request returned HTML HTTP 502 rather than the required 206/audio bytes. The same gateway implementation using the same staging fixture/session over localhost returned the correct 206 bytes. This narrows the failure to deployed runtime/delivery behavior but does not establish which hosting/configuration layer is responsible. Paid playback, download replay and deployed revocation acceptance did not run past that blocking failure; local tests are not a substitute.

All generated test accounts, assignments, grants, content requirements/policies, assets, usage records, sessions, authorizations, playback records and the private silent object were removed after each run. Sanitized administrative/security/access evidence is intentionally retained. Private run reports are under ignored `production/anmx-003/song-acceptance-<runId>.json`. The first report was overwritten by an early cleanup-only rerun; its failure remains in administrative audit and subsequent reproductions. Later cleanup reports use a separate filename. No existing memberships were changed and no real song allowance was consumed.

Follow-on patch validates/cancels rejected upstream bodies before Node-stream conversion and adds sanitized stage/status diagnostics; this is defensive handling, not a proven fix for the HTML 502. It also fixes a demonstrated local commit omission: first-delivery access history now persists with the usage ledger and authorization. New tests verify exactly one history record across ranges and no debit for rejected storage responses.

The staging harness pins the approved database/storage target fingerprint, rejects production, uses run-specific IDs and short-lived scoped grants, and independently attempts/verifies each cleanup step. After a process interruption, run the scoped cleanup command with the private report's run ID. The harness creates synthetic records directly, then uses real deployed login/authorization/delivery routes; it does not test registration/email or administrative grant UI end-to-end.

```sh
npm run test:staging-song-acceptance-safety
node --env-file=.env.migration.local --import tsx scripts/staging-song-acceptance.ts --environment=staging --execute-isolated-staging-tests
node --env-file=.env.migration.local --import tsx scripts/staging-song-acceptance.ts --environment=staging --cleanup-run=<run-id>
```

These commands mutate only isolated staging fixtures and require owner authorization. No production mode is supported; credentials and delivery artifacts are never printed.

Post-deployment result: readiness identifies `281618ec5a3a9051d1a5c459cf50169b0436475c`. The authenticated rerun still returned HTML 502 for the deployed range path, while the server-only origin read and local gateway comparison returned exact 206 bytes. Defensive upstream handling did not resolve the demonstrated staging failure. All fixture cleanup checks passed. Render's new `[protected-delivery]` stage/status/code diagnostics are the next required evidence; the generic signed-out `Member authentication is required` log is expected from anonymous negative checks and does not identify the range cause. Do not mark paid playback/download/revocation acceptance complete.

1. Confirm the API reports the new expected commit after deployment. A green generic readiness response alone is insufficient.
2. Confirm `/admin/members` labels and counts match effective membership, not historical readiness fields. Verify the song usage table appears; zero starts is valid.
3. With an approved isolated test member, verify one Free full play, range continuation without another debit, a second new-play denial, and separate download denial.
4. With approved isolated grants, verify paid-tier access and downgrade/suspension revocation. Do not modify existing customer memberships as a test.
5. Complete Stripe sandbox setup and real signed-webhook E2E after the owner creates the Stripe account. Keep live billing disabled.

Creative team remains blocked on the real final audio and approved versioned artist/reference context for The Spare Key Choir. No recording, audition, owner approval or public publication was invented. Engineering can continue independently on isolated staging playback acceptance and the transactional release executor; release operations remain private and locked.
