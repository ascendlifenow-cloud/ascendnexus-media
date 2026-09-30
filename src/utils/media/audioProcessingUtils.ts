import type { MediaAssetType } from "../../models/admin";
import type {
  AudioAssetMetadata,
  AudioProcessedOutput,
  AudioProcessedOutputType,
  AudioProcessingPlan,
  AudioProcessingPlanItem,
  WaveformMetadata,
} from "../../models/media";

const output = (
  type: AudioProcessedOutputType,
  required: boolean,
  publicAllowed: boolean,
  format?: string,
  metadata: Record<string, string | number | boolean | null> = {},
): AudioProcessingPlanItem => ({ type, required, publicAllowed, format, metadata });

export const audioProcessingPresets: Partial<Record<MediaAssetType, AudioProcessingPlanItem[]>> = {
  audio_preview: [
    output("streamable_preview", true, true, "source"),
    output("waveform_json", false, true, "json"),
    output("waveform_image", false, true, "png"),
  ],
  full_song: [
    output("streamable_full_song", false, false, "source"),
    output("waveform_json", false, false, "json"),
    output("waveform_image", false, false, "png"),
    output("transcoded_mp3", false, false, "mp3"),
    output("transcoded_aac", false, false, "aac"),
  ],
  custom_audio: [
    output("waveform_json", false, false, "json"),
    output("streamable_preview", false, false, "source"),
  ],
  stem: [
    output("waveform_json", false, false, "json"),
  ],
  instrumental: [
    output("streamable_full_song", false, false, "source"),
    output("waveform_json", false, false, "json"),
  ],
  vocal: [
    output("streamable_full_song", false, false, "source"),
    output("waveform_json", false, false, "json"),
  ],
};

export const createAudioProcessingPlan = (
  assetType: MediaAssetType,
  metadata?: AudioAssetMetadata | null,
): AudioProcessingPlan => ({
  assetType,
  sourceDurationSeconds: metadata?.durationSeconds,
  outputs: audioProcessingPresets[assetType] ?? [output("waveform_json", false, false, "json")],
  metadata: {
    planMode: "frontend-metadata-backend-generation-ready",
    fullSongPublicPlaybackDefault: false,
  },
});

export const createMockAudioOutputs = (
  plan: AudioProcessingPlan,
  sourceUrl: string,
  sourceStoragePath?: string,
  metadata?: AudioAssetMetadata | null,
  ready = false,
): AudioProcessedOutput[] => plan.outputs.map((item): AudioProcessedOutput => ({
  outputId: `${plan.assetType}-${item.type}`,
  type: item.type,
  url: ready && item.publicAllowed ? sourceUrl : undefined,
  storagePath: ready ? sourceStoragePath : undefined,
  format: item.format,
  durationSeconds: metadata?.durationSeconds ?? plan.sourceDurationSeconds,
  status: ready && item.publicAllowed ? "ready" : "planned",
  metadata: {
    mockOutput: ready,
    requiresBackendGeneration: true,
    publicAllowed: item.publicAllowed,
    required: item.required,
    ...(item.metadata ?? {}),
  },
}));

export const createWaveformMetadata = (
  outputs: readonly AudioProcessedOutput[],
): WaveformMetadata => {
  const json = outputs.find((item) => item.type === "waveform_json");
  const image = outputs.find((item) => item.type === "waveform_image");
  const ready = json?.status === "ready" || image?.status === "ready";
  const planned = Boolean(json || image);
  return {
    waveformJsonUrl: json?.url,
    waveformImageUrl: image?.url,
    peakDataReady: ready,
    status: ready ? "ready" : planned ? "planned" : "not_requested",
    metadata: {
      backendGenerationRequired: !ready && planned,
    },
  };
};

export const getStreamableAudioUrl = (
  outputs: readonly AudioProcessedOutput[] | null | undefined,
  fallbackUrl?: string,
): string | undefined => {
  const ready = outputs?.find((item) =>
    (item.type === "streamable_preview" || item.type === "streamable_full_song") &&
    item.status === "ready" &&
    item.url,
  );
  return ready?.url ?? fallbackUrl;
};
