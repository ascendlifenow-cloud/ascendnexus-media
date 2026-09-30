# ANM-WEB-098 Audio Playback Operations Runbook

## Preview Unavailable

1. Run `npm run audio:public:verify -- --releaseId=<releaseId>`.
2. Confirm the public release API includes a public preview URL.
3. Confirm release publication promoted only the audio-preview output, not a full-song master.
4. Republish the release after processing or promotion completes.

## Unsupported Format

1. Check the report MIME fields.
2. Confirm the preview output is MP3, AAC/M4A, OGG, WAV, or another configured browser-compatible format.
3. Re-run audio processing/transcode if required.

## CDN Or Range Failure

1. Run `npm run audio:public:range-test -- --releaseId=<releaseId>`.
2. Verify `Content-Type`, `Accept-Ranges`, `Content-Range`, `Cache-Control`, and CORS headers.
3. If the provider returns `200` for byte requests, document the limitation and test browser seeking manually.

## Buffering Or Stalling

1. Check CDN availability and preview file size.
2. Confirm the player reports `buffering` or `AUDIO_STALLED`, not a generic error.
3. Retry from the UI after network recovery.

## Full-Song Exposure Incident

1. Treat as Critical.
2. Unpublish affected release immediately.
3. Invalidate public caches.
4. Run `npm run audio:public:privacy-check` and `npm run public-api:safety-scan`.
5. Inspect release media links and publication promotion records.

## Multiple Audio Playback

The public client should have only one provider-owned `Audio` instance. If overlapping playback is observed, search for unmanaged `<audio>` or `new Audio()` in public components and route playback through `usePublicAudioPlayer`.

## Mobile Playback Blocked

Mobile browsers may require direct user gestures. The player maps blocked play promises to `AUDIO_PLAYBACK_BLOCKED`; ask the visitor to tap the play button again rather than auto-retrying.

## Waveform Mismatch

1. Confirm waveform version belongs to the same preview version.
2. Republish the release if waveform or preview changed.
3. Disable waveform display for the release if validation fails; playback should still work.

