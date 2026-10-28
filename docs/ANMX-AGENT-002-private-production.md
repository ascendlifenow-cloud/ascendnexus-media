# First private song production

Date: 2026-10-27. Environment: local ANMX JSON catalog and private local storage. No staging deployment or public actions.

## Actual artifacts

Song: The Spare Key Choir. Artist: Ascend Nexus Collective, identity carried forward from the user-established SONG CREATION context. The local seed-only catalog had no record for this identity; a private artist record was created without inventing biography details. This is not a claim that a new profile or cover has been approved.

Stable IDs: `anmx-song-the-spare-key-choir`, `anmx-release-the-spare-key-choir`, `anmx-artist-ascend-nexus-collective`. Revision 1. Artwork asset ID is recorded in `production/anmx-002/ingestion-result.json`.

Artifacts live under `production/anmx-002`: master-prompt.txt, lyrics.txt, two separate styles, details.txt, sources.json, original generated cover-v1.png, package.json, validation.json, destinations.json, review.json, review.html and network-validation.json. Documents are downloadable from the local review file. The exact production text and manifest are also stored on the private release record. Cover bytes were uploaded using MediaUploadApiService and associated using MediaLibraryService with public promotion disabled.

Saved counts: lyrics 4627 Unicode code points; style 1 876; style 2 869. Includes whitespace, bracketed directions and final newlines. No mechanical truncation. Source notes identify the bounded prior-song comparison and missing original handbook files. Cover is an original generated candidate; it does not impersonate an approved artist portrait or logo.

No final audio exists. No audio was auditioned or approved. The two styles, lyrics and master prompt form the generation packet. A real WAV/MP3 must be uploaded privately as full_song, associated with this release and checked before owner approval becomes possible. No song-generation API adapter was found or used.

## Execution and controls

`node --import tsx scripts/ingest-private-production.ts` ingested the draft locally. Repeated runs reused the release and asset. The command uses a single-run lock, stable catalog IDs and checksum-based asset reuse. It intentionally refuses MongoDB/remote storage; this is not a deployed scalable ingestion endpoint. A crash can leave its lock file requiring operator inspection. Current local JSON persistence has no cross-process transaction guarantee.

Release enrollment is recorded in the existing audit store. The service gate runs before managed release publishing, linked-storage promotion, distribution execution and upload retry. Editing release metadata does not remove enrollment. Existing unrelated legacy releases preserve their existing behavior. Managed draft assets must stay linked; this is not a comprehensive retrofit of every legacy promotion route or origin-revocation defect found in AGENT-001.

GET `/api/admin/releases/anmx-release-the-spare-key-choir/production-preview` returns the release, current linked checksums and bundle fingerprint after releases.read authentication. Cache-Control is private, no-store; X-Robots-Tag is noindex, nofollow.

POST `.../production-approve` requires releases.publish and an authenticated user ID matching `ANMX_PRODUCTION_OWNER_USER_ID`. No owner ID was configured by this assignment and no approval was written. Caller must provide the preview's current bundleHash. Missing/changed package or final audio prevents approval. Successful future approvals append an audit event; material changes invalidate the snapshot hash. This mechanism requires further concurrency and positive approval-to-publication testing before production use. No automatic deployment or publication is enabled.

Network tests executed on temporary local servers: anonymous preview 401; authenticated development-admin preview 200/private; unapproved publish 403; approval using only a development token 401; public song/release 404; direct production lyrics, image, review and database paths 403. Vite now denies production and local data paths while retaining its secret-file deny patterns. Development credentials used only in temporary local test requests, never returned in artifacts.

Independent review confirmed counts, saved/database text equality, active cover association, matching artifact checksum and admin_only storage. It found a publication race and missing manifest reconciliation. Manifest-to-linked-media reconciliation is now required. Approval requires a real authenticated admin session; development bypass alone cannot approve. Public execution remains unconditionally locked for enrolled drafts even after future owner review, until a transactional release executor is implemented and tested. No claim of a complete approval-to-publication workflow is made.

## Destination packages

YouTube, Facebook and Instagram each have distinct copy in destinations.json and the review page. These are review exports, not scheduled posts or upload-ready videos. Missing: final audio, video renders, real destination account connections and owner release approval.

Official documentation checked 2026-10-27: YouTube videos.insert supports authenticated video uploads and explicitly configurable privacy: https://developers.google.com/youtube/data/reference/rest/v3/videos/insert . No upload executed. Meta official content-publishing and Pages posts documentation returned HTTP 429 during retrieval; account permissions and media specifications remain unverified. No Meta adapter or unsupported API assertions were added. Verify https://developers.facebook.com/docs/instagram-platform/content-publishing/ and https://developers.facebook.com/docs/pages-api/posts/ before implementation.

## Remaining completion blockers

The private text/art production path is executed. A complete rendered-song release is not complete: real audio production, owner-selected final version, original handbook/version retrieval, brand/visual approval and production-owner configuration remain open. Staging ingestion/deployment was not performed. Future approval must explicitly select website visibility, actual destination media and schedule; the current bundle remains private with no schedule.
