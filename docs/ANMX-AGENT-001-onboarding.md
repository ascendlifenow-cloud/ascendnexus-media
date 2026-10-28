# Coordinated production workspace

Audit date: 2026-10-27. Status: initial audit and package-contract implementation; first milestone incomplete. No deployment, generation, ingestion, or publication performed in this assignment.

## Evidence and capability state

| Capability | Classification | Evidence and limits |
| --- | --- | --- |
| Production package counting and revision fingerprint | Verified working after contract test | `scripts/song-production-contract-test.ts`; synthetic boundary fixtures only |
| Artist/release catalog CRUD | Implemented but unverified in this assignment | Existing repositories, admin controllers, draft/public fields; no production database mutation |
| Admin/member authentication | Implemented but unverified in this assignment | Dedicated admin endpoints and server permission checks; prior chat evidence is historical |
| Public draft exclusion | Partial | ReleaseRepository.listPublic requires published status, published publicationState, publicVisibility; origin privacy still needs negative network tests |
| Media intake/storage/processing | Implemented but unverified | Existing intake records, checksum lineage, storage services and worker runner; deployment settings not inspected |
| Exact human release approval | Partial | New pure contract binds revisions; persistence, owner identity, API authorization and execution integration absent |
| Music generation | Blocked | No supported composition API adapter found; Suno is an external link. Existing preview service cuts existing audio and does not compose music |
| YouTube/Facebook/Instagram distribution | Blocked | BaseConnector explicitly disables external upload; registered connector names are not functional integrations |
| Newsletter/local destinations | Partial | Connector bookkeeping success is not evidence of delivery |
| Automated private draft ingestion | Planned | Must use stable IDs, atomic idempotency, real asset checksums, existing catalog/asset services |
| Full song demonstration | Blocked | Approved versioned artist/reference files and actual artwork/audio artifacts not yet selected and bound |

## Accessible creative sources

- `PROJECT: ANMX Web App`, thread `019f3cf9-4e5d-7862-b806-49d255e475a6`: accessible via thread reader. Repository remains implementation authority; prompts are not completion evidence.
- `AscendNexus: SONG CREATION`, thread `01a094cd-b08f-7003-aca3-565a6ba48075`: accessible. Latest inspected song: Under Every Question. Prior files are available under `/Users/stevecordova/Documents/Codex/2026-09-12/referenced-chatgpt-conversation-this-is-an/outputs`.
- Retrieved workflow: downloadable master prompt; separate artist/title, lyrics, and two styles; deliberate uniqueness comparison, with reference libraries used as starting points. Current task strengthens lyrics minimum to 4500 characters.
- `src/data/publicArtists.seed.ts`: catalog personas, not proof of approved generation profile versions.
- `server/models/artists/ArtistModel.ts` and `server/models/releases/SongReleaseModel.ts`: existing identity/catalog schemas; no typed creative-source approval contract.
- Existing intake checksum/path lineage proves operational provenance, not creative approval.
- Song Blueprint Handbook and foundational human knowledge catalogs are referenced in the creative chat; their actual attachments and versions have not been retrieved or verified here. Historical poets/writers/philosophers/scientists sources remain unreviewed until the original files are inventoried. No quotations fabricated.
- Seed preview filenames do not establish recording identity. Do not audition or reuse them as authentic songs without verification.

## Assignment boundaries

Coordinator owns integration, dependency ordering and final evidence. Research specialist owns source inventory and approved-reference selection; song specialist owns master prompt, lyrics, styles and uniqueness report; visual specialist owns approved-reference artwork and manifest; catalog specialist owns private draft and asset association; engineering specialist owns isolated code changes; independent validator owns counts, asset evidence, privacy/idempotency/approval negative tests. No specialist may publish or change shared catalog records concurrently.

Executed specialists in this audit: research/source inventory and publishing/security inspection were read-only. Independent validation could not inspect the parent's uncommitted files in its isolated snapshot; its initial result is not validation evidence. Future assignments must receive committed code or the exact patch. Creative generation and visual production have not been dispatched because reference approval is unresolved.

Each future assignment must identify input source versions, exact owned paths/record IDs, artifacts, acceptance checks and dependencies. Shared records have one writer. Code deployment and song publication are separate approvals.

## Implemented contract

`server/services/production/SongProductionContract.ts` defines stable song/revision, artist-profile version, brief, creative intent, master prompt, lyrics, exactly two styles, provenance, checksummed asset revisions, catalog metadata, destination copy/assets, website visibility and schedule.

Counting uses Unicode code points in the exact UTF-8 decoded saved text: whitespace, bracketed directions and each CR/LF count. No trim, newline conversion or normalization. Lyrics: 4500–5000 inclusive, preferably below 5000. Each style: 1–999. Provider UI counting remains unverified; validate again at the actual destination, especially for emoji/combining characters. Validation never pads or truncates lyrics.

Canonical SHA-256 includes the complete bundle, preserving array ordering. Approval requires the matching hash, approver and timestamp, no revocation, a valid package and final audio manifest. Any material bundle edit invalidates the hash. This helper does not verify files exist, audition audio, authenticate an approver or persist an audit record; callers must do those checks. It is not yet connected to public actions.

Validation command: `node --import tsx scripts/validate-song-production.ts <package.json>`. Contract test: `node --import tsx scripts/song-production-contract-test.ts`. Both produce safe count/status information; no URLs or raw lyrics printed.

## Blocking safety gaps and next assignment

1. `adminMediaController` promotion accepts forceFullSongPublic with media.edit; MediaStoragePromotionService lacks release approval. Demotion changes records without revoking the copied public origin object/CDN cache. Disable this path for production agents before ingestion automation.
2. AdminReleaseService.publishRelease and generic publication do not check exact owner-approved bundles. Release publication can publish an artist dependency before release readiness succeeds. The gate must run before every side effect.
3. DistributionEngineService accepts permissive publication state and synthetic fallback entities; scheduledFor is not enforced at execution. Retry also needs the same approval and current-state validation.
4. Implement persistent owner approval and atomic idempotent private ingestion using existing repositories/storage/audit. Recompute hashes from authoritative records and actual asset bytes immediately before publishing; never accept client assertions of approval/checksum as authority.
5. Then select a versioned approved artist, retrieve the actual handbooks, create one distinct song package/artwork and ingest privately. Test guessed public IDs/URLs, duplicate retries and every unapproved publish path. Do not mark complete until real tests pass.

No third-party adapter was implemented. Before one is built, verify current official provider documentation, account support, OAuth permissions, upload constraints, idempotency/reconciliation and rate limits. Unsupported platforms require an export, not simulated success. No production services or integrations were changed.
