# ANM-WEB-119 Media Intake Runbook

## Folder Not Watching

Run `npm run media-intake:health`. Confirm `MEDIA_INTAKE_ENABLED=true`, the intake folder exists, and destination folders do not overlap the source folder.

## File Not Imported

Check `npm run media-intake:records`. Common causes are temporary file names, unstable copy, unsupported extension, excessive size, symlink rejection, or validation failure.

## File Is Quarantined

Review the intake record `lastErrorSafeMessage`. Quarantined files failed validation and should not be manually moved into managed storage without investigation.

## Asset Requires Review

Open the Media Assignment Review page. The file was safely imported but classification or matching did not meet the confidence threshold.

## Wrong Auto Assignment

Use the Media Library link history to detach the asset, correct the entity metadata, and lower `MEDIA_INTAKE_MIN_CONFIDENCE` only with care. Investigate aliases or duplicate titles before re-enabling auto assignment.

## Duplicate File

Duplicate files are checksum matched. If the duplicate should be a new version, use the Media Library replacement/versioning workflow.

## Verification Commands

- `npm run media-intake:prepare-folders`
- `npm run media-intake:health`
- `npm run media-intake:scan`
- `npm run media-intake:records`
- `npm run test:admin-media-library`
- `npm run typecheck`
- `npm run build`
