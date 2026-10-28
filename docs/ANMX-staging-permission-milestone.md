# Staging permissions milestone

Date: 2026-10-28 (America/Denver).

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

1. Confirm the API reports the new expected commit after deployment. A green generic readiness response alone is insufficient.
2. Confirm `/admin/members` labels and counts match effective membership, not historical readiness fields. Verify the song usage table appears; zero starts is valid.
3. With an approved isolated test member, verify one Free full play, range continuation without another debit, a second new-play denial, and separate download denial.
4. With approved isolated grants, verify paid-tier access and downgrade/suspension revocation. Do not modify existing customer memberships as a test.
5. Complete Stripe sandbox setup and real signed-webhook E2E after the owner creates the Stripe account. Keep live billing disabled.

Creative team remains blocked on the real final audio and approved versioned artist/reference context for The Spare Key Choir. No recording, audition, owner approval or public publication was invented. Engineering can continue independently on isolated staging playback acceptance and the transactional release executor; release operations remain private and locked.
