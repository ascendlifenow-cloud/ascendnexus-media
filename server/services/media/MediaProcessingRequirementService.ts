import type { MediaAssetProcessingSummary, MediaProcessingJobType } from "../../models/mediaModels";
import { mediaProcessingJobService } from "./MediaProcessingJobService";

export class MediaProcessingRequirementService {
  getRequirements(assetType: string): { required: MediaProcessingJobType[]; optional: MediaProcessingJobType[] } {
    if (assetType === "full_song") return {
      required: ["checksum_verify", "audio_metadata"],
      optional: ["audio_waveform", "audio_transcode"],
    };
    if (assetType.includes("audio")) return {
      required: ["checksum_verify", "audio_metadata"],
      optional: ["audio_waveform", "audio_transcode"],
    };
    if (assetType.includes("image") || assetType.includes("cover") || assetType.includes("art") || assetType.includes("logo") || assetType.includes("banner")) {
      return {
        required: ["checksum_verify", "image_metadata"],
        optional: ["image_derivatives", "blur_placeholder"],
      };
    }
    return { required: ["checksum_verify"], optional: [] };
  }

  isJobRequired(jobType: MediaProcessingJobType, assetType: string): boolean {
    return this.getRequirements(assetType).required.includes(jobType);
  }

  async buildPublicationProcessingReadiness(assetId: string): Promise<{
    state: "processing_pending" | "required_processing_failed" | "ready";
    summary: MediaAssetProcessingSummary;
    blockingIssues: string[];
    warnings: string[];
  }> {
    const summary = await mediaProcessingJobService.buildAssetProcessingSummary(assetId);
    if (summary.blockingIssues.length) {
      return { state: "required_processing_failed", summary, blockingIssues: summary.blockingIssues, warnings: summary.warnings };
    }
    if (!summary.requiredOutputsReady || summary.activeJobs || summary.queuedJobs) {
      return { state: "processing_pending", summary, blockingIssues: [], warnings: summary.warnings };
    }
    return { state: "ready", summary, blockingIssues: [], warnings: summary.warnings };
  }
}

export const mediaProcessingRequirementService = new MediaProcessingRequirementService();
