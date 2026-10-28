# Private audition and audio review

Date: October 27, 2026 (America/Denver). No song publication is authorized.

## Scope

The admin Production Workspace can load the selected audio candidate on explicit user action. This is a bounded reviewer utility, not the public/member streaming gateway. It reads a maximum of the configured full-song limit or 128 MiB, whichever is lower; checks exact length and SHA-256 against the selected manifest; and returns verified bytes through the authenticated API. The client holds only a transient blob URL and native audio controls. Nothing preloads before the load action.

## API and authority

- POST `production-audition`: issue a five-minute reference for the exact current bundle/audio revision and administrator session.
- GET `production-audition?reference=...`: revalidate private draft, enrollment, manifest, asset/storage state, identity, expiry and session; return verified audio bytes. Two read attempts per reference.
- POST `production-audition-check`: revalidate the reference and current bundle; no playback data returned.
- POST `production-audio-review`: record explicit reviewer acknowledgement after source bytes have been verified, bound to the exact audio identity.

All paths are under `/api/admin/releases/:releaseId/`. Real admin sessions and `releases.read` plus `media.read` are mandatory. Acknowledgement also requires `releases.update`. Mutation-origin checks remain in the main server. Responses are private/no-store and noindex. Origin signing remains server-side; storage keys, provider URLs and credentials are not returned. The opaque reference alone grants no access: both administrator identity and session must match. Only the session hash is recorded.

The server permits one read at a time per process to bound buffering memory, and five new references per reviewer per minute. Origin reads have a 60-second deadline and reject redirects. The browser clears audio on unmount, session identity change, revision change and expiry, and checks current authorization every 15 seconds with a 10-second check timeout. Invalid/expired/revoked references clear playback.

## Review versus approval

Review is a deliberate user attestation, not proof that a human listened to the entire recording. The UI requires playback to start and a checked acknowledgement before confirmation. The backend requires verified source bytes and exact revision authority; it cannot prove attention or hearing. Automated tests never acknowledge a real staging recording.

The gate derives audio-review status from an append-only `production_audio_reviewed` event matching song/package revision, selected asset revision, checksum and storage-object identity. Editing `productionAudioReview` metadata cannot clear the blocker. Replacing audio or changing the package revision invalidates old review evidence. Repeated acknowledgement by the same reviewer is idempotent.

Acknowledgement does not change the material bundle hash or grant release approval. Owner-only exact-bundle approval remains separate, and managed production public execution remains locked pending the transactional executor. No social upload, public promotion or publishing action is added.

## Verification and limits

`npm run test:production-final-audio` now covers actual local upload plumbing with a tiny synthetic PCM WAV, exact byte readback, tampered source rejection, wrong administrator/session, read attempts, invalid expiry, explicit acknowledgement, retry behavior, revision invalidation, metadata-flag rejection, private response headers and continued publication lock. These are test bytes, not a generated or auditioned song. Build/typecheck and independent review are recorded per increment.

This utility intentionally buffers verified audio before browser delivery; there is no network range streaming in this increment. Seeking operates within the verified browser blob. It is not suitable for high-volume consumer delivery. Limits are process-local rather than a distributed quota. Whole-snapshot reads remain an existing performance limitation. Downloaded browser bytes cannot be recalled, and background-tab timer suspension can delay client cleanup; this is not DRM or download prevention. Final actor authentication and both read permissions are rechecked before serving bytes after a potentially long origin fetch. Independent reviewer Wegener identified the missing final permission recheck; it was fixed and covered by an HTTP regression test that revokes read permissions mid-request.

No final recording exists for The Spare Key Choir yet. Its audition view must show the honest no-candidate state. Real format playback, expiry UX and owner review require the actual selected recording and browser verification after deployment; synthetic backend tests do not establish those results.
