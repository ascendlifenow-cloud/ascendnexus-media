import type { MediaAsset } from "../../models/mediaModels";
import { jsonDatabase } from "./JsonDatabase";

export class MediaAssetPersistenceService {
  async create(asset: MediaAsset): Promise<MediaAsset> {
    await jsonDatabase.update((data) => data.mediaAssets.push(asset));
    return asset;
  }

  async get(assetId: string): Promise<MediaAsset | null> {
    const data = await jsonDatabase.read();
    return data.mediaAssets.find((asset) => asset.assetId === assetId) ?? null;
  }

  async list(): Promise<MediaAsset[]> {
    const data = await jsonDatabase.read();
    return [...data.mediaAssets].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async patch(assetId: string, patch: Partial<MediaAsset>): Promise<MediaAsset | null> {
    let updated: MediaAsset | null = null;
    await jsonDatabase.update((data) => {
      data.mediaAssets = data.mediaAssets.map((asset) => {
        if (asset.assetId !== assetId) return asset;
        updated = { ...asset, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      });
    });
    return updated;
  }

  async hardDelete(assetId: string): Promise<MediaAsset | null> {
    let deleted: MediaAsset | null = null;
    await jsonDatabase.update((data) => {
      deleted = data.mediaAssets.find((asset) => asset.assetId === assetId) ?? null;
      if (!deleted) return;
      data.mediaAssets = data.mediaAssets.filter((asset) => asset.assetId !== assetId);
      data.mediaStorageObjects = data.mediaStorageObjects.filter((object) => object.assetId !== assetId);
      data.mediaUploadJobs = data.mediaUploadJobs.filter((job) => job.mediaAssetId !== assetId);
      data.mediaAssetLinks = data.mediaAssetLinks.filter((link) => link.assetId !== assetId);
      data.mediaAssetVersions = data.mediaAssetVersions.filter((version) => version.assetId !== assetId);
      data.mediaProcessingJobs = data.mediaProcessingJobs.filter((job) => job.assetId !== assetId);
      data.mediaIntakeRecords = data.mediaIntakeRecords.filter((record) => record.mediaAssetId !== assetId);
    });
    return deleted;
  }
}

export const mediaAssetPersistenceService = new MediaAssetPersistenceService();
