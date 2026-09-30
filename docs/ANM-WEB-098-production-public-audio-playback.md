# ANM-WEB-098 Production Public Audio Playback

## Architecture

Public audio-preview playback now uses one shared controller:

- `PublicAudioPlayerProvider` owns the single browser `Audio` element.
- `usePublicAudioPlayer` exposes play, pause, seek, stop, retry, mute, and active-release state.
- `AudioPreviewPlayer` is a compatibility wrapper for existing release-card, homepage, artist, admin-preview, and detail call sites.
- `PublicGlobalAudioPlayer` renders a persistent synchronized mini-player inside the public shell.

This replaces independent card/detail audio elements with one authoritative state machine.

## Source Validation

`PublicAudioPreviewValidationService` rejects:

- full-song references
- private paths
- signed URL markers
- storage-path fields
- browser object URLs
- admin/API routes
- unsafe protocols

`PublicAudioSourceSelectionService` uses browser `canPlayType()` where available and prefers the public preview URL from the public DTO. No full-song fallback exists.

## Playback Policy

Selected policy: persistent global mini-player with synchronized local controls.

Playback can continue across normal public route transitions. The player can be closed with the stop control. If an active release is invalidated, unpublished, or becomes unavailable, `invalidateActiveRelease()` stops and marks the preview unavailable.

## Native Media Events

The provider listens for:

- `loadstart`
- `loadedmetadata`
- `loadeddata`
- `canplay`
- `playing`
- `pause`
- `waiting`
- `stalled`
- `seeking`
- `seeked`
- `timeupdate`
- `progress`
- `durationchange`
- `ended`
- `error`
- `abort`
- `emptied`
- `suspend`

UI state is derived from native events, not timers.

## Seeking And Duration

Duration comes from native media duration when finite, then processed public metadata, then unknown. Unknown duration is displayed as `--:--`.

Seeking uses an accessible range input and clamps values to the known duration. Waveform seeking is available when validated public peak data exists; otherwise the slider remains the accessible fallback.

## Waveforms

`PublicWaveformValidationService` bounds waveform samples and rejects nonnumeric or out-of-range peaks. The waveform component downsamples large peak arrays before rendering.

## Media Session

The provider feature-detects the Media Session API and sets public title, artist, and artwork only when available. Unsupported browsers are unaffected.

## Verification

Commands:

- `npm run audio:public:verify`
- `npm run audio:public:privacy-check`
- `npm run audio:public:range-test`
- `npm run audio:public:smoke-test`
- `npm run public-client:verify`

Local verification currently passes with warnings that local published records lack absolute public preview URLs. Live CDN/range/CORS verification requires staging media.

## Known Limitations

- iOS Safari, Android Chrome, Safari, Firefox, Edge, and Chrome real playback still require staging browser E2E.
- CDN range, CORS, cache-header, and byte-serving verification require absolute public preview URLs.
- Local persisted sample releases currently produce warning-only reports for missing public previews.

