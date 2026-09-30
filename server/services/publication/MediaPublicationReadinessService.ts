import type { MediaPublicationEntityType, MediaPublicationOptions, MediaPublicationReadiness } from "../../models/mediaModels";
import { entityPublicationAssetService } from "./EntityPublicationAssetService";

export class MediaPublicationReadinessService {
  async validatePublicationReadiness(
    entityType: MediaPublicationEntityType,
    entityId: string,
    _options: MediaPublicationOptions = {},
  ): Promise<MediaPublicationReadiness> {
    const assets = await entityPublicationAssetService.getEntityPublicationAssets(entityType, entityId);
    const requiredAssets = [...assets.required, ...assets.already_public.filter((asset) => asset.required)];
    const optionalAssets = [...assets.optional, ...assets.already_public.filter((asset) => !asset.required)];
    const blockingIssues = [
      ...assets.missing.filter((asset) => asset.required).flatMap((asset) => asset.blockingIssues),
      ...assets.blocked.filter((asset) => asset.required).flatMap((asset) => asset.blockingIssues),
      ...assets.private_only.filter((asset) => asset.required).flatMap((asset) => asset.blockingIssues),
      ...(requiredAssets.length === 0 && entityType !== "site_config" ? ["No required publication assets were discovered."] : []),
    ];
    const warnings = [
      ...optionalAssets.flatMap((asset) => asset.warnings),
      ...assets.private_only.filter((asset) => !asset.required).map((asset) => `${asset.assetType} remains private-only.`),
      ...assets.blocked.filter((asset) => !asset.required).flatMap((asset) => asset.blockingIssues),
    ];
    const requiredAssetsReady = requiredAssets.every((asset) => asset.processingReady && asset.storageReady) && !blockingIssues.length;
    const optionalAssetsReady = optionalAssets.every((asset) => asset.processingReady && asset.storageReady);
    const processingReady = [...requiredAssets, ...optionalAssets].every((asset) => asset.required ? asset.processingReady : true);
    const storageReady = [...requiredAssets, ...optionalAssets].every((asset) => asset.required ? asset.storageReady : true);
    return {
      entityType,
      entityId,
      ready: requiredAssetsReady && storageReady && processingReady,
      processingReady,
      storageReady,
      metadataReady: Boolean(entityId),
      publicMappingReady: requiredAssetsReady,
      requiredAssetsReady,
      optionalAssetsReady,
      blockingIssues,
      warnings,
      requiredAssets,
      optionalAssets,
      privateOnlyAssets: assets.private_only,
      blockedAssets: assets.blocked,
      missingAssets: assets.missing,
      checkedAt: new Date().toISOString(),
      metadata: {
        discoveredAssetCount: requiredAssets.length + optionalAssets.length + assets.private_only.length + assets.blocked.length + assets.missing.length,
      },
    };
  }
}

export const mediaPublicationReadinessService = new MediaPublicationReadinessService();
