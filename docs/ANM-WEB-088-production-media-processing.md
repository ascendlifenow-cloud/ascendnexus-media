# ANM-WEB-088 Production Media Processing

## Architecture

Media processing is handled by backend workers, persistent processing-job records, generated storage objects, and admin processing APIs.

Current worker classes:

- `ImageProcessingWorker`
- `AudioProcessingWorker`
- `MediaStorageOperationsWorker`
- `MediaCdnOperationsWorker`
- `MediaPublicationWorker`

Current queue names:

- `media-image-processing`
- `media-audio-processing`
- `media-storage-operations`
- `media-cdn-operations`
- `media-publication`
- `media-maintenance`
- `media-dead-letter`

Local development uses an in-process queue fallback. Staging and production reject that fallback when Redis is not configured.

## Job Types

Image:

- `image_metadata`
- `image_derivatives`
- `blur_placeholder`

Audio:

- `audio_metadata`
- `audio_waveform`
- `audio_transcode`

Storage/CDN/publication:

- `checksum_verify`
- `storage_promote_public`
- `storage_demote_private`
- `cdn_invalidate`
- publication actions

## Required And Optional Jobs

Images require checksum and metadata. Derivatives and blur placeholder are optional processing outputs unless publication policy promotes them to required later.

Audio previews and full songs require checksum and audio metadata. Waveform and transcode jobs are optional by default.

Required processing failures block publication readiness. Optional failures remain visible as warnings.

## Tool Detection

`MediaProcessingToolService` detects:

- image processor: Sharp when available; local fallback uses macOS `sips`
- FFmpeg
- FFprobe
- waveform tool readiness through FFmpeg

Admin health responses expose sanitized tool status and versions where available.

## Image Processing

Local real image processing is operational through `sips`:

- real image dimensions and format are extracted
- thumbnail/card/feature/banner/social derivatives are generated according to asset type
- derivative files are copied into storage
- derivative `MediaStorageObject` records are persisted
- blur placeholders are generated as bounded base64 PNG data URLs

Sharp is not installed in this workspace. Production should install Sharp or use a managed image-processing provider if the deployment target is not macOS.

## Audio Processing

Audio metadata uses FFprobe when available. It extracts duration, format, codec, bitrate, sample rate, channel count, channel layout, stream count, and safe metadata.

Waveform and transcode jobs use FFmpeg when available. In this workspace FFmpeg and FFprobe are unavailable, so audio metadata jobs fail truthfully when required and optional waveform/transcode jobs report skipped or failed state rather than fake outputs.

## Full-Song Privacy

Full-song processing enforces:

- private/admin-only source
- private derivatives
- no public URL
- no CDN URL
- no public storage path
- no fallback from preview output selection to full-song files

`assertProcessingMaintainsFullSongPrivacy` fails a job if a full-song output attempts to become public.

## Temporary Files

Workers create isolated temp directories under the system temp root. Processor-specific workspaces are cleaned in `finally` blocks. The `MediaTemporaryFileService` reports and cleans abandoned processing directories.

## Retry And Dead Letter

Transient/provider/unknown failures are retryable. Unsupported format, corrupt source, permission/configuration errors, and privacy violations are permanent.

Jobs that exhaust attempts move to `dead_letter`. Optional dead-letter jobs may be dismissed with a reason; required dead-letter jobs require retry or explicit future override policy.

## Admin APIs

Implemented processing endpoints include:

- `GET /api/admin/media/processing/jobs`
- `GET /api/admin/media/processing/jobs/:processingJobId`
- `GET /api/admin/media/assets/:assetId/processing`
- `POST /api/admin/media/processing/jobs/:processingJobId/retry`
- `POST /api/admin/media/processing/jobs/:processingJobId/cancel`
- `GET /api/admin/media/processing/health`
- `POST /api/admin/media/processing/queues/:queueName/pause`
- `POST /api/admin/media/processing/queues/:queueName/resume`
- `GET /api/admin/media/processing/dead-letter`
- `POST /api/admin/media/processing/dead-letter/:jobId/retry`
- `GET /api/admin/media/processing/recovery`
- `POST /api/admin/media/processing/recovery/:jobId`

## CLI

- `npm run media:worker`
- `npm run media:worker:image`
- `npm run media:worker:audio`
- `npm run media:worker:storage`
- `npm run media:worker:cdn`
- `npm run media:worker:publication`
- `npm run media:processing:health`
- `npm run media:processing:queues`
- `npm run media:processing:retry-failed`
- `npm run media:processing:recover-stalled`
- `npm run media:processing:cleanup-temp`

## Production Blockers

Before production verification:

- configure Redis and replace fallback mode with durable BullMQ or an equivalent queue adapter
- enable worker processes
- install/configure Sharp or a production image-processing provider
- install/configure FFmpeg and FFprobe for audio metadata, waveform, and transcode jobs
- run real provider storage output verification against staging object storage
- run worker load and graceful-shutdown verification in staging
