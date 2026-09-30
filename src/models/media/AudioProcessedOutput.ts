export type AudioProcessedOutputType =
  | "streamable_preview"
  | "streamable_full_song"
  | "waveform_json"
  | "waveform_image"
  | "transcoded_mp3"
  | "transcoded_aac"
  | "lyrics_timing"
  | "transcription"
  | "custom";

export type AudioProcessedOutputStatus = "planned" | "processing" | "ready" | "failed" | "skipped";

export interface AudioProcessedOutput {
  outputId: string;
  type: AudioProcessedOutputType;
  url?: string;
  storagePath?: string;
  format?: string;
  durationSeconds?: number;
  status: AudioProcessedOutputStatus;
  metadata?: Record<string, string | number | boolean | null>;
}
