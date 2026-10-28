# Agent teams and delivery policy

Updated 2026-10-28. These are coordinated specialist assignments, not continuously running autonomous services.

Stripe engineering increment: coordinator implemented hosted Checkout, SDK raw-body
verification, paid-through membership synchronization and provider portal handling.
Sagan independently reviewed payment bypasses and event timing; fixes include manual
override precedence, renewal preservation, detached mutations, current-customer
binding and pending subscription protection. Isolated tests run without real Stripe
requests. Stripe account creation and staging test payments remain owner dependencies;
live billing is not enabled. See `docs/ANMX-stripe-setup.md`.

## ANMX-AGENT-003

Owner-review follow-on: Lorentz implemented the exact-bundle summary/confirmation panel, coordinator integrated owner-only idempotent approval and fingerprint v2 with stricter readiness checks. Synthetic tests exercise positive review approval while proving public execution remains locked. No real/staging owner approval is granted. See `docs/ANMX-exact-bundle-owner-approval.md`.

Audition follow-on: Singer delivered the memory-only private audition UI; coordinator implemented session/revision-bound byte verification and explicit audio-review audit evidence. Synthetic WAV tests cover the bounded reviewer flow, not real song audition. Managed publication remains locked. See `docs/ANMX-private-audition-review.md` for operational limits and current verification scope.

Private-audio follow-on: Ramanujan delivered the candidate-picker interface, coordinator implemented revision-bound private association/manifest updates and tests, and Sartre independently reviewed the boundary. Real upload plumbing was tested with a tiny synthetic WAV in a temporary local database. This is not a real song recording or audition. The owner must still supply the final recording; audition and exact-bundle approval/execution remain separate work. See `docs/ANMX-private-final-audio-ingestion.md`.

Follow-on engineering increment: legacy Mongo `update()` now writes only changed records inside a transaction and rejects stale snapshots. Deterministic tests plus an isolated real staging transaction/rollback test passed without modifying application records. Independent review and deployment results are recorded separately; this does not enable public release execution. See `docs/ANMX-database-mutation-safety.md`.

The current evidence-based backlog and assignment ownership live in `docs/ANMX-AGENT-003-development-readiness.md`. `/admin/agents` reports persisted bounded assignments and sanitized per-run history; `/admin/production` remains the private release-review workspace. Status reports are operator-submitted evidence, not a claim that an external agent daemon is connected.

Current verified production candidate is the existing The Spare Key Choir draft, reused without duplicate ingestion. Fresh staging read-back matched exact text, artwork bytes, manifest and one private cover association. Lyrics are 4627 code points; styles 876/869. Public slug/ID queries exclude the release and unsigned origin delivery denies the private cover. Final audio, approved versioned artist brief, visual approval and owner release approval remain blocked.

Application increment adds isolated append-only reporting and immutable production-asset enrollment checked before public promotion, including after detachment. Local reporting/API/security tests and build pass. Staging browser/deployment verification is recorded in the current milestone report, not inferred from this historical summary. Public execution remains locked pending a tested transactional executor.

## Media Production Team

Coordinator integrates research, song writing, visual production and catalog operations. Research retrieved the existing SONG CREATION workflow and compared selected prior songs. Song production delivered The Spare Key Choir, 4627-character lyrics and two styles of 876/869 characters. Visual production generated an original cover candidate. Catalog operations ingested and reran the local private draft without duplicates. Original handbook attachments and approved visual reference versions remain unresolved. Final audio is not generated or auditioned. YouTube/Facebook/Instagram copy is prepared as review exports; external publishing adapters remain disconnected.

Next assignment: obtain a real generated recording, ingest it privately, select its exact revision and reconcile the full manifest for owner review. No release approval has been granted.

## Application Engineering Team

Engineering implemented package validation, exact bundle fingerprints, private preview endpoints, owner-only review approval checks and managed-draft publication blocking. Independent validation confirmed file counts, checksum/asset association and private storage, and identified the non-atomic publication gap. Managed productions remain execution-locked even after future review approval until a transactional executor is tested. Development-server private paths are denied. Negative API/privacy tests and production build passed locally.

Current staging increment adds an authenticated Production Workspace under /admin/production with per-release preview, candidate cover and destination copy. Staging transfer is restricted to the one named private demo, using existing MongoDB/R2 configuration; it is separate from code deployment. No production deployment authorized.

Next assignment: atomic approval/execution integration, final-audio ingestion UI and positive approval-to-publication tests. Do not represent these as operational today.

## Delivery preference

The user requested that future implemented changes be applied to staging so they can test them. For changes within an authorized task: run relevant checks, commit application changes, deploy to staging, verify the deployed version and give exact test URLs. Preserve private draft files outside the public Git repository. Report deployment failures or incomplete verification honestly. Production deployments and public music/social publication still require explicit authorization. Never infer song-publication approval from code-deployment approval.
