# Staging permissions milestone

Date: 2026-10-28 (America/Denver).

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
