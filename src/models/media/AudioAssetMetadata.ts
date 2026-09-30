export interface AudioAssetMetadata {
  durationSeconds?: number;
  format?: string;
  mimeType?: string;
  fileExtension?: string;
  fileSizeBytes?: number;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;
  isPreview: boolean;
  isFullSong: boolean;
  publicPlaybackAllowed: boolean;
  waveformReady: boolean;
  transcriptionReady?: boolean;
  lyricsTimingReady?: boolean;
  createdAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}
