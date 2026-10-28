# Media intake cleanup and automatic assignment

Default confidence threshold: strictly above 0.60. Configure MEDIA_INTAKE_MIN_CONFIDENCE as a fraction (0.60, not 60); MEDIA_INTAKE_AUTO_ASSIGN_ENABLED controls execution. Scores are deterministic filename-match heuristics, not calibrated probabilities.

Media Review now offers Auto-assign Intake. It re-evaluates up to 100 pending watched-folder intake records per run and reports assigned/skipped/failed outcomes. It does not delete files or records. Successful assignments use the existing artist/release assignment services and audit path, finish their intake records and refresh the review queue and client queries. Existing manually uploaded assets without intake records are outside this bounded cleanup action.

Current automatic classification supports recognized artist artwork and release cover filenames. Audio/video without a classification rule stays in manual review. One candidate must exceed the configured threshold. Multiple candidates, ties, empty tokens, invalid configuration, occupied slots, already-linked assets, published/active targets and enrolled production bundles remain blocked. Only empty draft targets qualify; no automatic public release publication is performed. Existing legacy assignment services retain their established artwork-promotion behavior; the production approval gate remains in force.

POST /api/admin/media/intake/auto-assign requires media.edit. The body defaults to dryRun=true; dryRun=false applies assignments. Server config remains authoritative. The lock prevents overlapping batch runs in one API process; distributed/concurrent human assignment still requires stronger transactional coordination before scaling to multiple writer instances. Item failures do not abort the rest of the batch.

Validation: scripts/media-intake-auto-assignment-test.ts covers threshold boundaries, ambiguous candidates, ties, empty tokens and invalid configuration. TypeScript and production build are required before staging deployment. Do not claim automatic matching of unclassified song audio or bulk deletion.
