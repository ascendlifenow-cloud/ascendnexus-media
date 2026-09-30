import { mediaProcessingJobService } from "./MediaProcessingJobService";

export class MediaAssetProcessingSummaryService {
  buildAssetProcessingSummary(assetId: string) {
    return mediaProcessingJobService.buildAssetProcessingSummary(assetId);
  }
}

export const mediaAssetProcessingSummaryService = new MediaAssetProcessingSummaryService();
