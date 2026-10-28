# Exact-bundle owner review approval

Date: October 27, 2026 (America/Denver). Building approval controls is not approval of a song.

## Implemented boundary

The Production Workspace displays a dedicated owner-approval summary: title/song ID, package revision, recorded artist/profile version, artwork/audio revisions and checksums, release metadata, recorded references, destination-specific copy and assets, intended website visibility, schedule and readiness blockers. Destination packages remain export-only. The action requires an explicit confirmation of the displayed bundle. It never runs automatically.

GET `/api/admin/releases/:releaseId/production-approval-summary` requires a real administrator session plus `releases.read` and `media.read`. POST `production-approve` additionally requires `releases.publish`, exact equality with server-only `ANMX_PRODUCTION_OWNER_USER_ID`, a current bundle hash and `confirmed: true`. Only those request fields are accepted. The local media development bypass cannot grant approval. Responses are private/no-store and noindex, without storage paths, signed media URLs, session hashes or the configured owner's ID.

An unset owner configuration disables approval; no account is silently promoted to owner. Configure the existing intended administrator's stable user ID in the backend environment only after deliberate operator review. Do not put it in client configuration or infer it from an email address or administrative role.

## Prerequisites

Approval requires an enrolled private draft, an internally consistent valid package, a recorded artist profile matching the package's version, exactly one artwork and one final-audio manifest revision, correct private media associations/checksums and protected asset enrollment. The selected audio must have an exact-revision audition acknowledgement. Source provenance is displayed as recorded, not independently re-certified. Missing or unreviewed real source context remains an operational blocker; this increment fabricates none.

Every active association must also appear in the manifest with its supported role. Extra hidden media links fail closed. Relevant intake identity/status/checksum/assignment is fingerprinted; quarantined, failed, ignored or superseded linked assets block approval. Separate production-document asset approval remains unsupported until its artifact validation exists; inline production text is still included in the bundle. Independent reviewer Nietzsche identified the reverse-link and quarantine gaps; both were fixed and regression-tested before deployment.

Fingerprint version 2 canonically includes the current release content, linked media graph, artist record, complete selected media records and storage state. Database enumeration and object-property ordering do not change it. Storage status, object identity, checksum, selected version, metadata, destination, schedule and visibility changes invalidate prior approval. This deliberately supersedes the weaker historical fingerprint; old approvals are not silently carried forward.

The approval event has a deterministic release/owner/hash identity, making repeat submissions idempotent. It is saved with a nonmaterial release timestamp touch through the conflict-checked Mongo delta transaction, so concurrent edits to that release fail rather than silently overwrite. Referenced-record predicate serializability is not claimed: subsequent decisions always recalculate the full graph, and the public executor remains disabled. A future transactional executor must close the side-effect boundary and recheck current authority.

## Publication remains locked

This records review approval only. It does not publish, promote storage, schedule jobs, upload to social destinations or authorize distribution. `assertProductionReleaseAllowed` still returns an execution-lock error even for a fully review-approved synthetic bundle. The single owner confirmation covers the entire displayed bundle rather than separate repeated content approvals.

## Verification

The isolated `test:production-final-audio` suite uses synthetic package records and a tiny PCM WAV, not a real song. It checks owner configuration, wrong-owner rejection, explicit confirmation, stale hash, repeated requests, safe summary headers/fields, approval persistence, canonical enumeration, storage status changes without timestamp changes, metadata invalidation and continued publication blocking. Existing upload/audition checks remain part of the same suite. Typecheck/build, database-delta and song-contract tests are run separately.

No real or staging owner-approval action is executed by the agent. The Spare Key Choir remains unapproved and has no final recording supplied. Real owner interaction, artist/source completion, deployed approval UI and eventual publication execution require their own evidence.

## Operations

- Missing owner: review the intended account and configure its stable ID on the API service; never weaken the owner check.
- Missing profile version: reconcile actual approved artist/source context and the saved package; do not invent a version to clear the blocker.
- Stale review: refresh both release and approval summary, inspect changed assets/copy, then reconfirm deliberately.
- Approval succeeded but publication fails: expected while the transactional executor is locked. Do not bypass asset enrollment or use generic publication as a workaround.
- Wrong media or missing artwork: correct the private artifact/association and repeat review. Do not attach unrelated catalog assets to satisfy readiness.

Approval withdrawal and the transactional publication executor remain follow-on work. Until those exist, all managed public execution stays locked.
# Approval Withdrawal Increment

Owner-only `POST /api/admin/releases/:releaseId/production-withdraw-approval`
accepts only `approvalId` and explicit `confirmed: true`. Real admin authentication,
media/read and release/read/publish permissions are required. Withdrawal remains
available after content changes or readiness failures. No private media is returned.

Withdrawal appends `production_bundle_approval_withdrawn`, references the immutable
approval ID, and uses the fixed reason `owner_withdrawal`. Existing audit evidence
is retained. Retrying the same withdrawal is idempotent and cannot withdraw a newer
approval. The current configured owner is authoritative; previous owners' approvals
do not authorize the current workflow.

Each withdrawal advances a release-wide generation derived from append-only audit
records, independent of wall-clock ordering. Approval requests carry the generation
from the review summary; old requests fail after withdrawal. Reapproval gets a new
approval ID even for identical content. Legacy approvals belong to generation zero.
The admin panel refreshes both summary and review after either action.

Both mutations touch the release for optimistic transaction conflict detection.
This is not a transactional public executor: referenced media dependencies are not
serializable across every existing mutation path. Publication stays unconditionally
locked. Already downloaded bytes cannot be recalled.

Verified locally with isolated synthetic fixtures: withdrawal after material edits,
owner/confirmation rejection, HTTP private headers, idempotent retry, stale approval
rejection, content reversion, distinct reapproval, and continuing execution lock.
Staging deployment and browser interaction remain unverified for this increment.
