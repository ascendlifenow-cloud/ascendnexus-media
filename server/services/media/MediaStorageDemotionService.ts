import { mediaStoragePromotionService, type StoragePromotionOptions } from "./MediaStoragePromotionService";
import { mediaStoragePersistenceService } from "./MediaStoragePersistenceService";

export class MediaStorageDemotionService {
  async demoteAsset(assetId: string, options: StoragePromotionOptions = {}) {
    const publicObjects = (await mediaStoragePersistenceService.list()).filter((object) => object.assetId === assetId && object.accessLevel === "public" && object.status !== "deleted");
    const demoted = [];
    for (const object of publicObjects) demoted.push(await mediaStoragePromotionService.demoteStorageObjectToPrivate(object.storageObjectId, options));
    return { success: true, assetId, demoted };
  }

  async deactivatePublicStorageObject(storageObjectId: string) {
    return mediaStoragePersistenceService.update(storageObjectId, { status: "archived", publicUrl: undefined });
  }

  async queueCdnInvalidation() {
    return { queued: false, reason: "CDN invalidation provider integration is readiness-only for this prompt." };
  }

  async preservePublicVersion(storageObjectId: string) {
    return mediaStoragePersistenceService.update(storageObjectId, { status: "archived" });
  }

  async restorePrivateReference(assetId: string) {
    return (await mediaStoragePersistenceService.list()).find((object) => object.assetId === assetId && object.accessLevel !== "public") ?? null;
  }

  async getDemotionStatus(assetId: string) {
    const objects = await mediaStoragePersistenceService.list();
    return {
      assetId,
      activePublicCount: objects.filter((object) => object.assetId === assetId && object.accessLevel === "public" && object.status === "ready").length,
    };
  }
}

export const mediaStorageDemotionService = new MediaStorageDemotionService();
