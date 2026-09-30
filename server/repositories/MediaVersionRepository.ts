import type { MediaAssetVersion } from "../models/mediaModels";
import { BaseRepository } from "./BaseRepository";
export class MediaVersionRepository extends BaseRepository<MediaAssetVersion & Record<string, unknown>> {
  constructor() { super("mediaAssetVersions", "versionId"); }
  async listByAsset(assetId: string) {
    return (await this.list({ includeArchived: true, includeDeleted: true }))
      .filter((version) => version.assetId === assetId)
      .sort((a, b) => a.versionNumber - b.versionNumber);
  }
  async getActive(assetId: string) {
    return (await this.listByAsset(assetId)).find((version) => version.status === "active") ?? null;
  }
  async getByAssetAndVersion(assetId: string, versionId: string) {
    return (await this.listByAsset(assetId)).find((version) => version.versionId === versionId) ?? null;
  }
}
export const mediaVersionRepository = new MediaVersionRepository();
