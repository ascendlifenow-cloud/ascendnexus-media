import type { MediaAsset } from "../../models/mediaModels";
import { mediaProcessingJobService } from "./MediaProcessingJobService";

export class AudioOutputSelectionService {
  async selectPreferredPreviewOutput(asset: MediaAsset) {
    const jobs = await mediaProcessingJobService.getJobsForAsset(asset.assetId);
    const transcode = jobs.flatMap((job) => job.outputs).find((output) => output.status === "ready" && output.outputType === "audio_transcoded_mp3" && output.url);
    if (transcode) return transcode;
    return asset.assetType !== "full_song" && asset.url ? { url: asset.url, source: "original_audio_preview" } : null;
  }

  async selectPreferredPrivateFullSongOutput(asset: MediaAsset) {
    if (asset.assetType !== "full_song") return null;
    const jobs = await mediaProcessingJobService.getJobsForAsset(asset.assetId);
    return jobs.flatMap((job) => job.outputs).find((output) => output.status === "ready" && !output.url) ?? null;
  }

  async getBrowserCompatibleOutputs(asset: MediaAsset) {
    const jobs = await mediaProcessingJobService.getJobsForAsset(asset.assetId);
    return jobs.flatMap((job) => job.outputs).filter((output) => output.status === "ready" && ["audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg"].includes(output.mimeType ?? ""));
  }

  async getPublicationRequiredAudioOutput(asset: MediaAsset) {
    if (asset.assetType === "full_song") return null;
    return this.selectPreferredPreviewOutput(asset);
  }
}

export const audioOutputSelectionService = new AudioOutputSelectionService();
