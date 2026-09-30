import type { PublicSongRelease } from "../../models/release";

export type PublicAudioPlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "ended"
  | "error"
  | "blocked"
  | "unavailable";

export interface PublicAudioPreviewContract {
  previewId?: string;
  releaseId: string;
  url: string;
  mimeType?: string;
  durationSeconds?: number;
  waveformUrl?: string;
  waveformData?: number[];
  version?: string;
  fileSizeBytes?: number;
  bitrate?: number;
  codec?: string;
  fallback?: boolean;
  metadata?: Record<string, unknown>;
}

export interface PublicAudioPlaybackError {
  code:
    | "AUDIO_PREVIEW_NOT_AVAILABLE"
    | "AUDIO_SOURCE_INVALID"
    | "AUDIO_SOURCE_UNSUPPORTED"
    | "AUDIO_SOURCE_NOT_PUBLIC"
    | "AUDIO_SOURCE_LOAD_FAILED"
    | "AUDIO_PLAYBACK_BLOCKED"
    | "AUDIO_NETWORK_ERROR"
    | "AUDIO_DECODE_ERROR"
    | "AUDIO_FORMAT_UNSUPPORTED"
    | "AUDIO_CDN_UNAVAILABLE"
    | "AUDIO_RANGE_REQUEST_FAILED"
    | "AUDIO_STALLED"
    | "AUDIO_ABORTED"
    | "AUDIO_RELEASE_UNPUBLISHED"
    | "AUDIO_VERSION_STALE"
    | "AUDIO_UNKNOWN_ERROR";
  message: string;
  retryable: boolean;
  releaseId?: string;
  previewVersion?: string;
  safeDetails?: Record<string, string | number | boolean | null>;
}

export interface PublicAudioReleaseSummary {
  releaseId: string;
  title: string;
  slug?: string;
  artistId?: string;
  artistName?: string;
  coverArtUrl?: string;
  release?: PublicSongRelease;
}

export interface BufferedRange {
  start: number;
  end: number;
}

export interface PublicAudioPlayerState {
  status: PublicAudioPlaybackStatus;
  activePreview?: PublicAudioPreviewContract;
  activeRelease?: PublicAudioReleaseSummary;
  source?: string;
  currentTime: number;
  duration: number;
  bufferedRanges: BufferedRange[];
  volume: number;
  muted: boolean;
  error?: PublicAudioPlaybackError;
  lastEvent?: string;
  version: number;
}

export interface PublicAudioPlayerContextValue extends PublicAudioPlayerState {
  loadPreview: (preview: PublicAudioPreviewContract, release: PublicAudioReleaseSummary, options?: { autoplay?: boolean; sourceContext?: string }) => Promise<void>;
  playPreview: (preview: PublicAudioPreviewContract, release: PublicAudioReleaseSummary, options?: { sourceContext?: string }) => Promise<void>;
  play: () => Promise<void>;
  pause: () => void;
  toggle: () => Promise<void>;
  seek: (seconds: number) => void;
  seekBy: (seconds: number) => void;
  setVolume: (value: number) => void;
  setMuted: (value: boolean) => void;
  stop: () => void;
  clear: () => void;
  retry: () => Promise<void>;
  invalidateActiveRelease: (releaseId: string, reason?: string) => void;
  isActive: (releaseId: string) => boolean;
  getPlaybackState: (releaseId: string) => PublicAudioPlaybackStatus;
}

