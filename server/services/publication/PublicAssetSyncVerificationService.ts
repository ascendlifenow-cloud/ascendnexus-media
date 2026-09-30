import type { MediaPublicationOperation } from "../../models/mediaModels";

export class PublicAssetSyncVerificationService {
  async verifyPublication(operation: MediaPublicationOperation, publicUrls: Record<string, string>) {
    const issues = Object.entries(publicUrls)
      .filter(([, url]) => !url || url.includes("private") || url.includes("signed"))
      .map(([assetId]) => `Public URL for ${assetId} is not public-safe.`);
    return {
      syncReportId: `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      success: issues.length === 0,
      expectedAssetIds: operation.promotedAssetIds,
      publicUrls,
      blockingIssues: issues,
      warnings: [],
      checkedAt: new Date().toISOString(),
    };
  }
}

export const publicAssetSyncVerificationService = new PublicAssetSyncVerificationService();
