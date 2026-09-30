export type WaveformStatus = "not_requested" | "planned" | "processing" | "ready" | "failed";

export interface WaveformMetadata {
  waveformJsonUrl?: string;
  waveformImageUrl?: string;
  sampleCount?: number;
  peakDataReady: boolean;
  status: WaveformStatus;
  metadata?: Record<string, string | number | boolean | null>;
}
