# ANMX-AGENT-003: Development Readiness and First Production Milestone

Date: October 27, 2026 (America/Denver). Coordinator owns shared catalog mutations, integration and staging deployment. Song publication is not authorized.

## Evidence-Based State

| Capability | State | Evidence / boundary |
| --- | --- | --- |
| Public landing and artwork delivery | Verified working in preceding staging check | Public, member and admin browser rendering; 100 public asset references available. Not certification of every catalog record. |
| Bounded specialist collaboration | Verified working | Creative researcher Hegel, frontend engineer Hubble, independent engineering reviewer McClintock; coordinator integrates. These are assignments, not resident autonomous services. |
| Agent status and sanitized logs | Implemented; local tests passed | Append-only report store, revision conflicts, idempotency, history pagination, RBAC, private responses; staging verification follows deployment. |
| Private song packet | Verified working on staging | The Spare Key Choir: exact saved lyrics/master/styles and manifest; 4627 lyric code points and styles 876/869. Existing draft reused, not represented as a newly written song. |
| Private artwork association and bytes | Verified working on staging | One active cover link; exact SHA-256 equality between R2 bytes, saved cover and manifest. No public URLs on candidate asset. |
| Draft visibility | Verified for named staging packet | Public slug and ID lookups 404; public media domain private path 404; unsigned R2 byte-range request returns recognized authentication error 400. |
| Owner approval / publication | Partial and execution locked | Exact-bundle review gate exists; no final audio, approved profile version or owner approval. Transactional public executor remains absent. |
| Asset protection after detach | Implemented; local negative test passed | Immutable asset enrollment checked before public promotion, independently of active association links. |
| Music generation | Blocked | No functioning composition API adapter. No final recording generated or auditioned. |
| Third-party publishing | Blocked | Review copy exports exist; real destination account connections, final media and owner approval remain absent. No simulated success. |
| Full deployment certification | Implemented but unverified | Existing infrastructure and prior docs are not evidence of full staging E2E or production certification. |

## Assignment Ownership

| Specialist | Inputs / scope | Owned artifacts | Acceptance / dependencies |
| --- | --- | --- | --- |
| Hegel: creative continuity | Existing SONG CREATION references and ANMX-002 packet | Private `production/anmx-003/` source inventory and continuity/validation reports | Exact text counts, source hashes, honest approval/audio gaps; no shared catalog or publication writes |
| Hubble: application UI | Read-only status API contract and existing admin patterns | Agent Status page and API client | Loading/error/empty states, filters, selection, timestamped log pagination, mobile layout; coordinator wires backend/routes |
| McClintock: independent validation | Actual source, changes and tests | Read-only review findings | Identify integrity/security gaps; no live mutations or self-approval |
| Coordinator | Dependencies, security, integration and deployed evidence | Backend/reporting contract, staging verification, backlog and release evidence | Tests before staging; only targeted authorized writes; never publish song assets |

## Prioritized Backlog

| Priority | Assignment | Current state | Exit evidence / blocker |
| --- | --- | --- | --- |
| P0 | Replace legacy whole-catalog Mongo snapshot mutation | Partial; high-risk existing architecture | Targeted/transactional writes throughout mutating services, concurrent update/delete tests. New agent reports are deliberately excluded from snapshot registry. |
| P0 | Transactional approval-to-publication executor | Planned; public execution locked | Revision-bound owner authority, rollback and duplicate/retry/concurrency tests. Must preserve existing public releases. |
| P1 | Approved artist/brand/reference version | Blocked | Owner-selected approved brief and original handbook/reference versions; existing identity provenance is not fabricated profile approval. |
| P1 | Generate and audition final recording | Blocked | Real WAV/MP3 from supported/manual generation, selected revision and review evidence. No subscription implies generation API access. |
| P1 | Final-audio ingestion and complete release preview | Partial | Secure upload and exact manifest update using current media system; reconcile audio/artwork/metadata before approval. |
| P1 | Automated trusted-agent reporting integration | Planned | Existing page reports persisted bounded assignments. Future runners must submit safe events; no fake heartbeat or automatic execution is enabled. |
| P1 | Broader identity/playback/intake regression coverage | Partial | Isolated staging account and media E2E, access changes, recovery and CI gates. Prior individual checks are not full-suite certification. |
| P2 | Restore three missing original artwork sources | Blocked | Original files must be re-uploaded; do not substitute unrelated art or publish private assets. |
| P2 | Remove legacy smoke-test site configuration | Open | Review actual site title/social links, approve intended public copy, targeted backup/update and verify metadata. |
| P2 | Provider publishing adapters | Blocked | Official capability/permissions verification, real accounts, final media and exact destination approval before uploads. |

## Agent Status Architecture

- Admin route `/admin/agents`; existing `operations.read` authorization. Production Workspace is also discoverable under Overview.
- GET `/api/admin/agents/runs` with optional team/status; GET `/api/admin/agents/runs/:runId/logs` with bounded revision pagination.
- New `agent_run_reports` Mongo collection is **not** registered in the legacy catalog snapshot registry. Targeted insert-only records have unique report IDs and unique run/revision pairs. Indexes are created for this isolated collection only.
- Local JSON fallback uses a separate locked file, not the catalog snapshot. A crashed local writer can leave a lock requiring inspection; no unsafe automatic lock removal.
- Reports bind agent/team/assignment, revision, server time, actor, environment, safe summary, blockers and allowlisted evidence. No prompts, lyrics, private media, raw exceptions, credentials or arbitrary metadata.
- Completed assignments require evidence and no unresolved blockers within their scope. A blocked release can coexist with a completed bounded audit. Running reports become stale after 15 minutes without a new report; stale is not live process health.
- Operator CLI `npm run agents:report -- --environment=staging --file=<safe-report-file> --execute`; load authorized staging configuration without exposing secrets. Without `--execute`, validation only. Production writes are disabled. Browser writes are not exposed.
- No agent event approves a release, schedules a publication, deploys code or grants access. Reporting is separate from execution and human release approval.
- Independent review found two operator/report credential-disclosure failure paths; both were corrected. Malformed connection/report inputs and credential-shaped report text now fail safely. Exact reviewer reproductions are covered by regression tests.
- Initial list is capped at 100 latest assignments, with total count; per-run logs paginate at up to 100 records. Automatic retention/purge and a continuous external runner are not implemented.

## Private Song Milestone

Stable release `anmx-release-the-spare-key-choir`, revision 1, remains a private text/art production candidate. Reused existing staged draft to avoid duplicate songs or unnecessary rewriting. Original text, artwork candidate, review copy and downloads remain outside public Git in `production/anmx-002`; fresh evidence is under private `production/anmx-003`.

The artist identity comes from retrieved SONG CREATION context, but no approved versioned generation profile was independently established. This milestone does not claim a fully produced or release-approved song. Final audio is absent. YouTube/Facebook/Instagram copy remains review exports, not uploaded content or finished destination videos.

Read-back verification checks exact package text, authoritative artist mapping, manifest/link reconciliation, remote cover bytes and privacy. Optional `--enroll-assets` appends only the managed asset protection event. It does not upload, republish or rewrite existing catalog records. Earlier insert-only transfer still needs a generalized transactional ingestion replacement before broader use.

The staging browser exposed failed direct signed-cover rendering. The private preview now requests an authenticated admin image endpoint requiring both release and media read permissions. It resolves the draft's active cover, permits only private ready image storage, caps reads at 20 MB and verifies exact manifest SHA-256 before returning private/no-store image bytes. Signing stays server-side. The client uses credentialed CORS fetch and an in-memory blob URL revoked on cleanup; restrictive cross-origin resource policy is preserved. Local storage remains supported. This is an admin review endpoint, not member playback or public media delivery.

## Testing Checklist for Staging

1. Open `/admin/agents`: verify real assignment records, team/status filters, selected details, report timestamps, blockers, Refresh and history. Empty filters must show an honest empty state.
2. Open `/admin/production/anmx-release-the-spare-key-choir`: inspect candidate cover, lyrics, two styles, counts, destination copy and approval blockers. Nothing should be scheduled or published.
3. In a signed-out browser, the agent API and private production preview must return 401. Public release slug and ID lookups must not return the draft.
4. Check a 375px viewport: no horizontal overflow; assignment selection/details/logs remain usable. Member and public browsing must remain separate from admin access.
5. Public existing artists, songs and artwork should still load. Do not use real public promotion or publication as a test.

## Verification Commands

```sh
npm run test:agent-status
npm run test:agent-operator-safety
npm run test:private-production-cover
node --import tsx scripts/song-production-contract-test.ts
node --import tsx scripts/validate-song-production.ts production/anmx-002/package.json
npm run typecheck
npm run build
node --env-file=.env.migration.local --import tsx scripts/verify-private-production-staging.ts --environment=staging
```

The first test uses a temporary local database/listener and checks reporting safety, restart persistence, snapshot isolation, pagination, 401/403/private caching, no browser writes and detached-asset enforcement. Real distributed race behavior and production certification remain separate work.
