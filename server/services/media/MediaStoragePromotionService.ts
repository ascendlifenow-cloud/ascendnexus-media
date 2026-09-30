import type { MediaAccessLevel, MediaStorageObject } from "../../models/mediaModels";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { mediaBackendConfig } from "../../config/mediaBackendConfig";
import { backendStorageProviderRegistry } from "../../storage/StorageProviderRegistry";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { mediaAssetPersistenceService } from "./MediaAssetPersistenceService";
import { mediaStoragePersistenceService } from "./MediaStoragePersistenceService";
import { mediaStoragePathService } from "./MediaStoragePathService";
import { mediaCdnService } from "./MediaCdnService";

export interface StoragePromotionOptions {
  actorId?: string;
  reason?: string;
  forceFullSongPublic?: boolean;
}

export class MediaStoragePromotionService {
  async promoteStorageObjectToPublic(storageObjectId: string, options: StoragePromotionOptions = {}) {
    const storageObject = await mediaStoragePersistenceService.get(storageObjectId);
    if (!storageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");
    if (storageObject.assetType === "full_song" && !options.forceFullSongPublic) {
      throw new MediaApiError("MEDIA_PERMISSION_DENIED", "Full song assets cannot be promoted to public storage by default.", 403, "storage");
    }
    return this.promoteStorageObject(storageObject, options);
  }

  async demoteStorageObjectToPrivate(storageObjectId: string, options: StoragePromotionOptions = {}) {
    const storageObject = await mediaStoragePersistenceService.get(storageObjectId);
    if (!storageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Storage object was not found.", 404, "database");
    const updated = await mediaStoragePersistenceService.update(storageObject.storageObjectId, {
      accessLevel: "admin_only",
      publicUrl: undefined,
      status: storageObject.status === "deleted" ? storageObject.status : "archived",
      metadata: {
        ...(storageObject.metadata ?? {}),
        demotionReason: options.reason ?? null,
        demotedAt: new Date().toISOString(),
      },
    });
    if (updated?.assetId) {
      await mediaAssetPersistenceService.patch(updated.assetId, {
        url: undefined,
        thumbnailUrl: undefined,
        largeUrl: undefined,
        updatedBy: options.actorId,
        metadata: { demotedPublicStorageObjectId: updated.storageObjectId },
      });
    }
    await mediaAuditPersistenceService.record("storage_object_demoted_private", "Demoted storage object from public delivery", {
      actorId: options.actorId,
      entityType: "media_storage_object",
      entityId: storageObject.storageObjectId,
      metadata: { reason: options.reason ?? null },
    });
    return updated;
  }

  async validatePromotionReadiness(assetId: string) {
    const asset = await mediaAssetPersistenceService.get(assetId);
    if (!asset) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media asset was not found.", 404, "database");
    if (asset.assetType === "full_song") return { ready: false, blockingIssues: ["Full-song assets are private-only by default."] };
    const source = (await mediaStoragePersistenceService.list()).find((object) => object.assetId === assetId || object.storageObjectId === asset.metadata?.storageObjectId);
    return {
      ready: Boolean(source && source.status !== "deleted"),
      sourceStorageObjectId: source?.storageObjectId,
      blockingIssues: source ? [] : ["No source storage object exists for this asset."],
    };
  }

  async promoteAsset(assetId: string, options: StoragePromotionOptions = {}) {
    const readiness = await this.validatePromotionReadiness(assetId);
    if (!readiness.ready || !readiness.sourceStorageObjectId) {
      throw new MediaApiError("MEDIA_STORAGE_FAILED", readiness.blockingIssues.join(" "), 400, "storage");
    }
    return this.promoteStorageObjectToPublic(readiness.sourceStorageObjectId, options);
  }

  private async promoteStorageObject(storageObject: MediaStorageObject, options: StoragePromotionOptions) {
    const provider = backendStorageProviderRegistry.getActiveProvider();
    const existingPublic = (await mediaStoragePersistenceService.list()).find((object) =>
      object.assetId === storageObject.assetId &&
      object.accessLevel === "public" &&
      object.status === "ready" &&
      object.metadata?.sourceStorageObjectId === storageObject.storageObjectId
    );
    if (existingPublic) return existingPublic;
    const asset = storageObject.assetId ? await mediaAssetPersistenceService.get(storageObject.assetId) : null;
    const target = {
      targetType: String(storageObject.metadata?.targetType ?? "media_library"),
      targetId: storageObject.assetId,
      ownerType: "media_asset",
      ownerId: storageObject.assetId,
      assetType: storageObject.assetType,
      intendedUse: "storage_object_promoted_public",
      accessLevel: "public" as MediaAccessLevel,
    };
    const nextPath = mediaStoragePathService.buildPublicAssetPath({
      target,
      fileName: storageObject.fileName,
    });
    const copied = provider.copyFile
      ? await provider.copyFile(storageObject.storagePath, nextPath, { accessLevel: "public", assetType: storageObject.assetType, mimeType: storageObject.mimeType, metadata: { sourceStorageObjectId: storageObject.storageObjectId } })
      : { publicUrl: provider.getPublicUrl(nextPath), metadata: { copyUnsupported: true } };
    const now = new Date().toISOString();
    const publicStorageObject: MediaStorageObject = {
      ...storageObject,
      storageObjectId: `storage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      storagePath: nextPath,
      publicUrl: copied.publicUrl ?? provider.getPublicUrl(nextPath),
      accessLevel: "public",
      status: "ready",
      uploadedAt: now,
      updatedAt: now,
      metadata: {
        ...(storageObject.metadata ?? {}),
        ...(copied.metadata ?? {}),
        sourceStorageObjectId: storageObject.storageObjectId,
        previousStoragePath: storageObject.storagePath,
        publicCdnUrl: mediaCdnService.getCdnUrl({ ...storageObject, storagePath: nextPath, accessLevel: "public", publicUrl: copied.publicUrl ?? provider.getPublicUrl(nextPath) }),
        promotionReason: options.reason ?? null,
        promotedAt: now,
      },
    };
    await mediaStoragePersistenceService.create(publicStorageObject);
    if (publicStorageObject.assetId) {
      await mediaAssetPersistenceService.patch(publicStorageObject.assetId, {
        status: asset?.status === "published" ? "published" : asset?.status ?? "draft",
        url: mediaCdnService.getCdnUrl(publicStorageObject) ?? publicStorageObject.publicUrl,
        thumbnailUrl: publicStorageObject.mediaCategory === "image" ? publicStorageObject.publicUrl : undefined,
        largeUrl: publicStorageObject.mediaCategory === "image" ? publicStorageObject.publicUrl : undefined,
        updatedBy: options.actorId,
        metadata: {
          ...(asset?.metadata ?? {}),
          publicStorageObjectId: publicStorageObject.storageObjectId,
          sourceStorageObjectId: storageObject.storageObjectId,
          publicCdnUrl: mediaCdnService.getCdnUrl(publicStorageObject),
        },
      });
    }
    await mediaAuditPersistenceService.record("storage_object_promoted_public", "Promoted storage object to public delivery", {
      actorId: options.actorId,
      entityType: "media_storage_object",
      entityId: storageObject.storageObjectId,
      metadata: { publicStorageObjectId: publicStorageObject.storageObjectId, previousStoragePath: storageObject.storagePath },
    });
    return publicStorageObject;
  }

  async getPromotionStatus(assetId: string) {
    const objects = await mediaStoragePersistenceService.list();
    return {
      assetId,
      publicObjects: objects.filter((object) => object.assetId === assetId && object.accessLevel === "public"),
      privateObjects: objects.filter((object) => object.assetId === assetId && object.accessLevel !== "public"),
    };
  }
}

export const mediaStoragePromotionService = new MediaStoragePromotionService();
