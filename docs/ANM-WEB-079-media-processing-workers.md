# ANM-WEB-079 Media Processing Workers

## Architecture

Media uploads now create persistent background processing jobs after storage and media asset records are created. Upload responses are not blocked by optional image/audio/CDN work.

The current implementation uses an in-process queue registry with BullMQ/Redis-ready configuration points. When Redis/BullMQ are added later, the `MediaQueueRegistry` boundary is the replacement point.

## Queue Names

- `media-image-processing`
- `media-audio-processing`
- `media-storage-operations`
- `media-cdn-operations`
- `media-maintenance`
- `media-dead-letter`

## Environment Variables

- `MEDIA_QUEUE_REDIS_URL`
- `MEDIA_QUEUE_PREFIX`
- `MEDIA_IMAGE_WORKER_CONCURRENCY`
- `MEDIA_AUDIO_WORKER_CONCURRENCY`
- `MEDIA_STORAGE_WORKER_CONCURRENCY`
- `MEDIA_JOB_MAX_ATTEMPTS`
- `MEDIA_JOB_BACKOFF_MS`
- `MEDIA_JOB_REMOVE_COMPLETED_AFTER`
- `MEDIA_JOB_REMOVE_FAILED_AFTER`
- `MEDIA_WORKERS_ENABLED`
- `MEDIA_WORKER_SHUTDOWN_TIMEOUT_MS`
- `MEDIA_AUDIO_TRANSCODE_ENABLED`
- `MEDIA_AUDIO_PREVIEW_BITRATE`
- `MEDIA_AUDIO_AAC_BITRATE`

## Worker Commands

- `npm run media:worker`
- `npm run media:worker:image`
- `npm run media:worker:audio`
- `npm run media:worker:storage`
- `npm run media:worker:cdn`
- `npm run media:queue:health`

## Job Creation

Backend-proxied upload completion and direct multipart completion both call `MediaProcessingEnqueueService`.

Queued jobs include:

- `checksum_verify`
- image: `image_metadata`, `image_derivatives`, `blur_placeholder`
- audio: `audio_metadata`, `audio_waveform`, `audio_transcode`

Required jobs can block publishing when failed. Optional jobs can warn without invalidating the upload.

## Image Processing

The worker layer is prepared for server-side `sharp`. In the current dependency set, deep metadata extraction, derivatives, and blur placeholders are marked as readiness/skipped outputs rather than pretending generated files exist.

Derivative path convention:

`{sourceStoragePath}/derivatives/planned/{derivativeType}.webp`

## Audio Processing

The worker layer is prepared for `ffprobe` and `ffmpeg`.

Current behavior:

- audio metadata verifies source availability and records readiness output
- waveform generation is marked skipped unless tooling is added
- transcoding is disabled by default
- full-song outputs remain private/admin-only

## Storage And CDN Jobs

Storage workers support checksum verification, public promotion readiness, and private demotion readiness.

CDN invalidation jobs are skipped when no CDN invalidation provider is configured. This does not block public visibility changes.

## Retry And Dead Letter

Retry policy uses exponential backoff from `MEDIA_JOB_BACKOFF_MS`. Retryable categories include transient/provider/unknown failures. Exhausted jobs move to `dead_letter` and remain visible for admin attention.

## Admin UI

The admin processing dashboard is available at:

`/admin/media/processing`

It shows health, queue counts, processing jobs, job details, retry, and cancel readiness.

## Health Endpoint

`GET /api/admin/media/processing/health`

The response intentionally excludes Redis credentials, provider credentials, signed URLs, authorization headers, and private file contents.

## Development Behavior

When workers are disabled:

- uploads still complete
- jobs are persisted and queued
- admin health shows fallback/readiness mode
- optional outputs are not claimed as ready

This keeps local development honest while preserving production architecture.
