# ANM-WEB-119 Watched Media Intake

## Architecture

ANM-WEB-119 adds a server-side watched-folder intake layer that feeds the existing Media Library. It does not create a second storage system or bypass media validation. The authoritative pipeline is:

1. `MediaIntakeFolderWatcherService` watches one configured flat folder and also runs reconciliation scans.
2. `MediaIntakeFileStabilityService` waits until file size and mtime stop changing.
3. `MediaIntakeValidationService` validates path safety, symlinks, size, extension, magic bytes, and media category.
4. `MediaIntakeDuplicateService` calculates SHA-256 and blocks repeated ingestion.
5. `MediaIntakeClassificationRuleRegistry` applies filename rules.
6. `WatchedFolderMediaIngestionService` imports through `MediaUploadApiService`.
7. Strong matches are assigned through existing media links and pending entity metadata.
8. Ambiguous assets remain in Media Library with `assignmentReviewStatus=review_required` and appear in the existing Media Assignment Review queue.

## Configuration

Environment variables:

- `MEDIA_INTAKE_ENABLED`
- `MEDIA_INTAKE_FOLDER`
- `MEDIA_INTAKE_ARCHIVE_FOLDER`
- `MEDIA_INTAKE_REVIEW_FOLDER`
- `MEDIA_INTAKE_QUARANTINE_FOLDER`
- `MEDIA_INTAKE_FAILED_FOLDER`
- `MEDIA_INTAKE_POLL_INTERVAL_MS`
- `MEDIA_INTAKE_STABILITY_WINDOW_MS`
- `MEDIA_INTAKE_MAX_FILE_SIZE`
- `MEDIA_INTAKE_AUTO_ASSIGN_ENABLED`
- `MEDIA_INTAKE_MIN_CONFIDENCE`
- `MEDIA_INTAKE_DELETE_SOURCE_AFTER_SUCCESS`
- `MEDIA_INTAKE_ALLOWED_EXTENSIONS`
- `MEDIA_INTAKE_FOLLOW_SYMLINKS=false`

The watcher is disabled unless explicitly enabled. Destination folders must not equal or sit under the flat source folder.

## Filename Rules

Artist character art:

- `ANMX_<ArtistToken>_<NN>.<ext>`
- `00` maps to `artist_profile_image`
- `01+` maps to ordered `artist_character_art`

Release cover art:

- `<ReleaseToken>_CoverArt.<ext>`
- Matching normalizes case, spaces, punctuation, underscores, hyphens, and apostrophes.

Unrecognized images, audio, and video are imported as unclassified assets and sent to review.

## Safety

- Full/song and private masters are not made public by intake.
- Imported assets use `admin_only` storage by default.
- Auto-assignment records links and pending metadata only; publication remains a separate workflow.
- Ambiguous matches are never auto-assigned.
- Invalid files are quarantined.
- Duplicate files are archived as duplicates.

## Admin And CLI

Admin API:

- `GET /api/admin/media/intake/health`
- `GET /api/admin/media/intake/status`
- `GET /api/admin/media/intake/records`
- `POST /api/admin/media/intake/scan`
- `POST /api/admin/media/intake/start`
- `POST /api/admin/media/intake/stop`

CLI:

- `npm run media-intake:health`
- `npm run media-intake:prepare-folders`
- `npm run media-intake:scan`
- `npm run media-intake:records`

## Known Limitations

Video and audio filename auto-assignment rules are intentionally deferred. Audio/video files without configured naming rules enter review. Production malware scanning remains dependent on the existing security provider configuration.
