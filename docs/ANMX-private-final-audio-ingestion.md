# Private final-audio candidate ingestion

Date: October 27, 2026 (America/Denver).

## Implemented workflow

The Production Workspace now provides a right-side private-audio picker. Upload through the existing Media Library infrastructure, then select an eligible `full_song` candidate. The server associates the chosen asset with the managed private draft, records its stored SHA-256 and storage/version reference in the package manifest, increments the package revision and updates release, media-link and intake assignment state together. This is candidate selection, not audio generation, audition, owner approval or publication.

Endpoints:

- `GET /api/admin/releases/:releaseId/production-audio-candidates`
- `POST /api/admin/releases/:releaseId/production-final-audio`

Both require a real administrator session plus `releases.read` and `media.read`. Saving also requires `releases.update` and `media.update`. The local legacy media bypass cannot authorize these endpoints. Mutation-origin protection remains enforced by the main server. Responses use private/no-store and noindex headers. Candidate DTOs contain only title, asset ID, MIME and byte size; no storage paths, URLs or checksums.

## Safety and revision contract

Only enrolled, private draft releases are eligible. Candidates must be draft full-song assets, have one unambiguous ready/uploaded private storage object under the configured private prefix, an approved audio MIME and a stored SHA-256. Public URLs, public storage, other active content associations, archived assets, failed storage records and quarantined intake records are rejected. Existing upload assets may contain an internal locator equal to their validated private storage key; selection removes that locator from the asset URL field. It never accepts an arbitrary external/signed URL. The endpoint does not accept a storage key, URL, checksum, tier or visibility from the browser.

The request names the selected asset, exact current review bundle hash and a bounded request identifier. Retry receipts bind release, actor, request, selected asset and before/after bundle hashes. A lost response can be retried without duplicate links or revision increments. A changed review must be refreshed; stale requests do not silently overwrite newer edits. Replacing audio preserves the old asset privately, replaces its active release link and updates its assignment status. It does not delete recordings.

The Mongo legacy-update adapter commits changed records in a conflict-checked transaction. Selected asset and storage records are updated so their validated snapshots participate in conflict checks. This does not claim serializable predicate protection against every unrelated legacy writer. Full-snapshot read cost remains a known migration boundary.

Every selected candidate receives immutable production-asset enrollment. Public promotion remains blocked even after detachment. Manifest, assignment and audit changes commit with the release. Existing bundle approvals no longer match the changed fingerprint. `productionAudioReview` becomes pending, and the review explicitly requires audition. No audition-completion endpoint is added in this increment. Public execution remains locked.

## Tests and evidence

`npm run test:production-final-audio` uses an isolated local database/listener with explicitly synthetic records. It covers manifest revision, replacement, retry identity, stale/mass-assignment rejection, private storage restrictions, safe DTOs, authentication, permissions, origin rejection and continuing asset/release publication locks. It also passes a tiny synthetic PCM WAV through the actual existing upload service, then lists and selects that asset through the new API. No test fixture is a generated or auditioned song recording.

Existing private-cover, song-package-contract and database-delta tests were rerun. Typecheck and build passed. Browser/deployed checks are recorded separately after push; local test success is not evidence of successful real recording ingestion.

Frontend specialist Ramanujan built the picker component; the coordinator integrated the backend and review page. Independent reviewer Sartre identified the existing-upload locator mismatch. The fix and actual-upload regression resolved that finding; follow-up static review found no blocking findings within this increment.

## Operator testing

1. Open a managed draft in `/admin/production`.
2. Open the private final-audio picker. Confirm loading, empty/error states and candidate title/type/size only.
3. After supplying the actual recording through Media Library as a private full-song asset, explicitly select it. Confirm one new revision and one active audio association.
4. Reload the review. Verify audition and owner approval remain pending, the package contains the chosen checksum/version, and the draft remains absent from public release lookup.

Do not attach unrelated catalog audio merely to clear a blocker. The Spare Key Choir still has no final recording supplied by the owner. Its text, artwork and existing revision must remain unchanged until the real candidate is selected.

## Remaining work

The follow-on bounded private audition and exact-audio acknowledgement implementation is described in `docs/ANMX-private-audition-review.md`. Network range streaming remains separate; the reviewer utility uses verified, bounded blobs. Approved artist/reference brief, complete bundle approval UX, tested transactional publication executor and distribution adapters remain outstanding. No public action or third-party generation is enabled.

## Staging rollout status

Code commits `b5809d9` and `b5b4e8e` were pushed to main. At the post-push check, staging readiness remained healthy, but the new candidate endpoint still returned 404 and the public shell referenced the older `index-D9bCW3wM.js` bundle. No GitHub build/check records were available for this commit. Therefore deployment and deployed-picker verification are pending, not completed. Operator redeployment of the existing Render API and Cloudflare frontend was requested. The existing staging production draft was not assigned any audio. The owner confirmed no final recording is available yet and asked to continue the review-workflow buildout.

After the owner completed redeployment, a subsequent staging check confirmed the newer `index-CjoOzk4u.js` shell, candidate endpoint 401 when signed out, restored admin session and functional candidate shelf with zero eligible candidates. The private release remained 404 publicly and its bundle hash was unchanged. No staging audio was selected. The automated private-cover read discrepancy persisted and was not represented as an artwork pass.
