import type { MediaAsset, MediaAssetLink, MediaAssetVersion, MediaStorageObject } from "../../models/mediaModels";
import { mediaAssetPersistenceService } from "./MediaAssetPersistenceService";
import { mediaStoragePersistenceService } from "./MediaStoragePersistenceService";
import { mediaAuditPersistenceService } from "./MediaAuditPersistenceService";
import { mediaLinkRepository } from "../../repositories/MediaLinkRepository";
import { mediaVersionRepository } from "../../repositories/MediaVersionRepository";
import { artistRepository } from "../../repositories/ArtistRepository";
import { releaseRepository } from "../../repositories/ReleaseRepository";
import { MediaApiError } from "../../utils/media/mediaErrorUtils";
import { mediaPublicUrlService } from "./MediaPublicUrlService";
import { mediaStoragePromotionService } from "./MediaStoragePromotionService";

const publicUrlFromStorage = (storageObject: MediaStorageObject): string | undefined =>
  storageObject.accessLevel === "public" ? storageObject.publicUrl : undefined;

const safeUrlFromStorage = (storageObject: MediaStorageObject): string | undefined =>
  publicUrlFromStorage(storageObject) ?? (storageObject.accessLevel === "public" ? storageObject.storagePath : undefined);

const storageUrlForAsset = (asset: MediaAsset, storageObject: MediaStorageObject): string | undefined => {
  if (storageObject.accessLevel !== "public") return asset.url;
  return safeUrlFromStorage(storageObject) ?? asset.url;
};

const isPublicDeliveryUrl = (value: string | undefined): value is string =>
  Boolean(value && (value.startsWith("https://") || value.startsWith("http://") || value.startsWith("/uploads/media/public")));

const isPublicEntityField = (fieldKey: string): boolean => {
  const lower = fieldKey.toLowerCase();
  return lower.includes("image") || lower.includes("cover") || lower.includes("banner") || lower.includes("art") || lower.includes("thumbnail") || lower.includes("preview");
};

const isFullSongField = (fieldKey: string): boolean => fieldKey.toLowerCase().includes("fullsong");

const metadataString = (metadata: Record<string, unknown> | undefined, key: string): string | undefined => {
  const value = metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
};

const buildVersion = (asset: MediaAsset, storageObject: MediaStorageObject, versionNumber: number, actorId?: string, changeReason?: string): MediaAssetVersion => ({
  versionId: `version-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  assetId: asset.assetId,
  versionNumber,
  storageObjectId: storageObject.storageObjectId,
  url: storageUrlForAsset(asset, storageObject) ?? "",
  fileName: storageObject.fileName,
  mimeType: storageObject.mimeType,
  fileSizeBytes: storageObject.fileSizeBytes,
  assetType: asset.assetType,
  status: "active",
  createdAt: new Date().toISOString(),
  createdBy: actorId,
  metadata: {
    changeReason: changeReason ?? null,
    accessLevel: storageObject.accessLevel,
    mediaCategory: storageObject.mediaCategory,
    storagePath: storageObject.storagePath,
  },
});

export class MediaLibraryService {
  async listAssets(filters: { search?: string; assetType?: string; status?: string; ownerType?: string; ownerId?: string } = {}) {
    const query = filters.search?.trim().toLowerCase();
    return (await mediaAssetPersistenceService.list())
      .filter((asset) => filters.assetType ? asset.assetType === filters.assetType : true)
      .filter((asset) => filters.status ? asset.status === filters.status : true)
      .filter((asset) => filters.ownerType ? asset.ownerType === filters.ownerType : true)
      .filter((asset) => filters.ownerId ? asset.ownerId === filters.ownerId : true)
      .filter((asset) => query ? `${asset.title} ${asset.description ?? ""} ${asset.assetType}`.toLowerCase().includes(query) : true);
  }

  async getAssetDetails(assetId: string) {
    const asset = await this.requireAsset(assetId);
    return {
      asset,
      storageObjects: (await mediaStoragePersistenceService.list()).filter((item) => item.assetId === assetId),
      links: await mediaLinkRepository.listByAsset(assetId),
      versions: await mediaVersionRepository.listByAsset(assetId),
    };
  }

  async getVersionHistory(assetId: string) {
    const asset = await this.requireAsset(assetId);
    const versions = await this.ensureVersionHistory(asset);
    return {
      assetId,
      activeVersionId: versions.find((version) => version.status === "active")?.versionId ?? asset.activeVersionId ?? "",
      versions,
      createdAt: versions[0]?.createdAt ?? asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }

  async replaceFromStorageObject(assetId: string, storageObjectId: string, options: { actorId?: string; changeReason?: string; updatePublicFields?: boolean } = {}) {
    const asset = await this.requireAsset(assetId);
    const storageObject = await mediaStoragePersistenceService.get(storageObjectId);
    if (!storageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Replacement storage object was not found.", 404, "database");
    if (storageObject.assetId && storageObject.assetId !== assetId) throw new MediaApiError("MEDIA_TARGET_INVALID", "Storage object belongs to a different asset.", 400, "validation");
    this.assertCompatible(asset, storageObject);
    const versions = await this.ensureVersionHistory(asset);
    const previousActive = versions.find((version) => version.status === "active") ?? null;
    if (previousActive) await mediaVersionRepository.update(previousActive.versionId, { status: "replaced" });
    const newVersion = buildVersion(asset, storageObject, Math.max(0, ...versions.map((version) => version.versionNumber)) + 1, options.actorId, options.changeReason);
    await mediaVersionRepository.create(newVersion as MediaAssetVersion & Record<string, unknown>);
    await mediaStoragePersistenceService.update(storageObjectId, { assetId, versionId: newVersion.versionId } as Partial<MediaStorageObject> & Record<string, unknown>);
    const shouldUpdateUrls = options.updatePublicFields !== false && storageObject.accessLevel === "public";
    const updatedAsset = await mediaAssetPersistenceService.patch(assetId, {
      ...(shouldUpdateUrls ? {
        url: newVersion.url,
        thumbnailUrl: storageObject.mediaCategory === "image" ? newVersion.url : asset.thumbnailUrl,
        largeUrl: storageObject.mediaCategory === "image" ? newVersion.url : asset.largeUrl,
      } : {}),
      activeVersionId: newVersion.versionId,
      metadata: {
        ...(asset.metadata ?? {}),
        activeVersionId: newVersion.versionId,
        previousVersionId: previousActive?.versionId ?? null,
        lastReplaceReason: options.changeReason ?? null,
      },
      updatedBy: options.actorId,
    });
    await mediaAuditPersistenceService.record("media_asset_replaced", `Replaced media asset "${asset.title}"`, {
      actorId: options.actorId,
      entityType: "media_asset",
      entityId: assetId,
      metadata: { previousVersionId: previousActive?.versionId, newVersionId: newVersion.versionId, publicFieldsUpdated: shouldUpdateUrls },
    });
    return {
      success: true,
      assetId,
      previousVersion: previousActive,
      newVersion,
      updatedMediaAsset: updatedAsset,
      warnings: shouldUpdateUrls ? [] : ["Replacement is active privately; public fields were not updated because the storage object is not public."],
    };
  }

  async rollbackToVersion(assetId: string, versionId: string, options: { actorId?: string; updatePublicFields?: boolean; changeReason?: string } = {}) {
    const asset = await this.requireAsset(assetId);
    const versions = await this.ensureVersionHistory(asset);
    const target = versions.find((version) => version.versionId === versionId);
    if (!target) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media version was not found.", 404, "database");
    const storageObject = await mediaStoragePersistenceService.get(target.storageObjectId);
    if (!storageObject) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Version storage object was not found.", 404, "database");
    const previousActive = versions.find((version) => version.status === "active") ?? null;
    for (const version of versions) {
      await mediaVersionRepository.update(version.versionId, { status: version.versionId === target.versionId ? "active" : version.status === "deleted" ? "deleted" : "rollback_available" });
    }
    const shouldUpdateUrls = options.updatePublicFields !== false && storageObject.accessLevel === "public";
    const updatedMediaAsset = await mediaAssetPersistenceService.patch(assetId, {
      ...(shouldUpdateUrls ? {
        url: target.url,
        thumbnailUrl: storageObject.mediaCategory === "image" ? target.url : asset.thumbnailUrl,
        largeUrl: storageObject.mediaCategory === "image" ? target.url : asset.largeUrl,
      } : {}),
      activeVersionId: target.versionId,
      metadata: {
        ...(asset.metadata ?? {}),
        activeVersionId: target.versionId,
        lastReplaceReason: options.changeReason ?? "Rollback",
      },
      updatedBy: options.actorId,
    });
    await mediaAuditPersistenceService.record("media_version_rollback", `Rolled back media asset "${asset.title}" to version ${target.versionNumber}`, {
      actorId: options.actorId,
      entityType: "media_asset",
      entityId: assetId,
      metadata: { previousVersionId: previousActive?.versionId, activeVersionId: target.versionId },
    });
    return { success: true, assetId, previousVersion: previousActive, newVersion: target, updatedMediaAsset };
  }

  async linkAsset(assetId: string, input: { entityType: string; entityId: string; fieldKey: string; intendedUse?: string; actorId?: string; updateEntityField?: boolean; metadata?: Record<string, unknown> }) {
    const asset = await this.requireAsset(assetId);
    if (asset.status === "archived" || asset.status === "deleted") throw new MediaApiError("MEDIA_TARGET_INVALID", "Archived or deleted assets cannot be assigned.", 400, "validation");
    this.assertFieldCompatible(asset, input.fieldKey);
    const existing = await mediaLinkRepository.findActiveEntityField(input.entityType, input.entityId, input.fieldKey);
    if (existing) await mediaLinkRepository.update(existing.linkId, { status: "replaced" });
    const link: MediaAssetLink = {
      linkId: `link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      assetId,
      entityType: input.entityType,
      entityId: input.entityId,
      fieldKey: input.fieldKey,
      status: "active",
      createdAt: new Date().toISOString(),
      metadata: { intendedUse: input.intendedUse ?? null, ...(input.metadata ?? {}) },
    };
    await mediaLinkRepository.create(link as MediaAssetLink & Record<string, unknown>);
    let updatedMediaAsset = await mediaAssetPersistenceService.patch(assetId, {
      assignmentStatus: "assigned",
      ownerType: input.entityType,
      ownerId: input.entityId,
      metadata: {
        ...(asset.metadata ?? {}),
        assignmentStatus: "assigned",
        assignmentReviewStatus: "resolved",
        assignedEntityType: input.entityType,
        assignedEntityId: input.entityId,
        assignedFieldKey: input.fieldKey,
        assignedIntendedUse: input.intendedUse ?? null,
      },
      updatedBy: input.actorId,
    });
    let updatedEntity: unknown;
    if (input.updateEntityField !== false) {
      try {
        const applied = await this.applyLinkedAssetToEntity(updatedMediaAsset ?? asset, link, input.actorId);
        updatedMediaAsset = applied.updatedMediaAsset ?? updatedMediaAsset;
        updatedEntity = applied.updatedEntity;
      } catch (error) {
        await mediaLinkRepository.update(link.linkId, { status: "detached", metadata: { ...(link.metadata ?? {}), assignmentApplyError: error instanceof Error ? error.message : "Unknown assignment apply error" } });
        await mediaAssetPersistenceService.patch(assetId, { assignmentStatus: "detached", ownerType: asset.ownerType, ownerId: asset.ownerId, updatedBy: input.actorId });
        throw error;
      }
    }
    await mediaAuditPersistenceService.record("media_asset_linked", `Linked media asset "${asset.title}" to ${input.entityType} ${input.entityId}`, {
      actorId: input.actorId,
      entityType: "media_asset",
      entityId: assetId,
      metadata: { linkId: link.linkId, targetEntityType: input.entityType, targetEntityId: input.entityId, fieldKey: input.fieldKey, entityFieldUpdated: input.updateEntityField !== false },
    });
    return { success: true, link, mediaAsset: updatedMediaAsset, updatedEntity };
  }

  async detachLink(linkId: string, actorId?: string) {
    const link = await mediaLinkRepository.get(linkId);
    if (!link) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media link was not found.", 404, "database");
    const updated = await mediaLinkRepository.update(linkId, { status: "detached" });
    const remaining = (await mediaLinkRepository.listByAsset(link.assetId)).filter((item) => item.linkId !== linkId && item.status === "active");
    if (!remaining.length) await mediaAssetPersistenceService.patch(link.assetId, { assignmentStatus: "detached", updatedBy: actorId });
    await mediaAuditPersistenceService.record("media_asset_detached", `Detached media asset ${link.assetId}`, { actorId, entityType: "media_asset", entityId: link.assetId, metadata: { linkId } });
    return { success: true, link: updated };
  }

  async archiveVersion(assetId: string, versionId: string, actorId?: string) {
    const version = await mediaVersionRepository.getByAssetAndVersion(assetId, versionId);
    if (!version) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media version was not found.", 404, "database");
    if (version.status === "active") throw new MediaApiError("MEDIA_TARGET_INVALID", "Active media version cannot be archived.", 400, "validation");
    const updated = await mediaVersionRepository.update(versionId, { status: "archived" });
    await mediaAuditPersistenceService.record("media_version_archived", `Archived media version ${version.versionNumber}`, { actorId, entityType: "media_asset", entityId: assetId, metadata: { versionId } });
    return { success: true, version: updated };
  }

  async getDependencies(assetId: string) {
    const asset = await this.requireAsset(assetId);
    const links = await mediaLinkRepository.listByAsset(assetId);
    const versions = await mediaVersionRepository.listByAsset(assetId);
    const storageObjects = (await mediaStoragePersistenceService.list()).filter((item) => item.assetId === assetId);
    return {
      asset,
      activeLinks: links.filter((link) => link.status === "active"),
      linkHistory: links,
      versions,
      storageObjects,
      publiclyReferenced: asset.status === "published" || storageObjects.some((item) => item.accessLevel === "public" && Boolean(item.publicUrl)),
      safeDeleteAllowed: links.every((link) => link.status !== "active") && asset.status !== "published",
    };
  }

  private async requireAsset(assetId: string) {
    const asset = await mediaAssetPersistenceService.get(assetId);
    if (!asset) throw new MediaApiError("MEDIA_UPLOAD_NOT_FOUND", "Media asset was not found.", 404, "database");
    return asset;
  }

  private async ensureVersionHistory(asset: MediaAsset) {
    const versions = await mediaVersionRepository.listByAsset(asset.assetId);
    if (versions.length) return versions;
    const storageObject = (await mediaStoragePersistenceService.list()).find((item) => item.assetId === asset.assetId);
    if (!storageObject) return [];
    const initial = buildVersion(asset, storageObject, 1, asset.createdBy, "Initial media asset version");
    await mediaVersionRepository.create(initial as MediaAssetVersion & Record<string, unknown>);
    await mediaAssetPersistenceService.patch(asset.assetId, { activeVersionId: initial.versionId, metadata: { ...(asset.metadata ?? {}), activeVersionId: initial.versionId } });
    return [initial];
  }

  private assertCompatible(asset: MediaAsset, storageObject: MediaStorageObject) {
    if (asset.assetType === "full_song" && storageObject.accessLevel === "public") throw new MediaApiError("MEDIA_TARGET_INVALID", "Full-song replacements must remain private.", 400, "validation");
    if (asset.assetType.includes("audio") || asset.assetType === "full_song") {
      if (storageObject.mediaCategory !== "audio") throw new MediaApiError("MEDIA_TYPE_UNSUPPORTED", "Audio asset replacement requires an audio storage object.", 400, "validation");
      return;
    }
    if (storageObject.mediaCategory === "audio") throw new MediaApiError("MEDIA_TYPE_UNSUPPORTED", "Image/visual assets cannot be replaced by audio storage objects.", 400, "validation");
  }

  private assertFieldCompatible(asset: MediaAsset, fieldKey: string) {
    const lower = fieldKey.toLowerCase();
    if ((lower.includes("image") || lower.includes("cover") || lower.includes("banner") || lower.includes("art")) && (asset.assetType.includes("audio") || asset.assetType === "full_song")) {
      throw new MediaApiError("MEDIA_TARGET_INVALID", "Audio assets cannot be assigned to image fields.", 400, "validation");
    }
    if (lower.includes("audiopreview") && asset.assetType === "full_song") throw new MediaApiError("MEDIA_TARGET_INVALID", "Full-song assets cannot be assigned as audio previews.", 400, "validation");
  }

  private async getPrimaryStorageObject(asset: MediaAsset) {
    const objects = (await mediaStoragePersistenceService.list()).filter((item) => item.assetId === asset.assetId);
    const explicitPublicId = metadataString(asset.metadata, "publicStorageObjectId");
    const explicitSourceId = metadataString(asset.metadata, "storageObjectId") ?? metadataString(asset.metadata, "sourceStorageObjectId");
    return objects.find((item) => item.storageObjectId === explicitPublicId)
      ?? objects.find((item) => item.accessLevel === "public" && item.status === "ready")
      ?? objects.find((item) => item.storageObjectId === explicitSourceId)
      ?? objects[0];
  }

  private async resolvePublicDeliveryUrl(asset: MediaAsset, fieldKey: string, actorId?: string) {
    let current = await mediaAssetPersistenceService.get(asset.assetId) ?? asset;
    const currentUrl = [current.url, current.largeUrl, current.thumbnailUrl, metadataString(current.metadata, "publicUrl"), metadataString(current.metadata, "publicCdnUrl")]
      .find(isPublicDeliveryUrl);
    if (currentUrl) return { url: currentUrl, asset: current };
    if (!isPublicEntityField(fieldKey) || isFullSongField(fieldKey) || current.assetType === "full_song") return { url: undefined, asset: current };
    const storageObject = await this.getPrimaryStorageObject(current);
    if (!storageObject) return { url: undefined, asset: current };
    const publicObject = storageObject.accessLevel === "public"
      ? storageObject
      : await mediaStoragePromotionService.promoteStorageObjectToPublic(storageObject.storageObjectId, { actorId, reason: `media_link_${fieldKey}_public_delivery` });
    const promotedUrl = mediaPublicUrlService.getCdnUrl(publicObject)
      ?? mediaPublicUrlService.getPublicStorageUrl(publicObject)
      ?? publicObject.publicUrl
      ?? String(publicObject.metadata?.publicCdnUrl ?? "");
    current = await mediaAssetPersistenceService.get(asset.assetId) ?? current;
    if (!isPublicDeliveryUrl(promotedUrl)) {
      throw new MediaApiError("MEDIA_PUBLIC_URL_INVALID", "Selected media asset did not produce a public-safe URL after promotion.", 400, "storage");
    }
    return { url: promotedUrl, asset: current };
  }

  private async applyLinkedAssetToEntity(asset: MediaAsset, link: MediaAssetLink, actorId?: string) {
    if (link.entityType === "release") return this.applyAssetToRelease(asset, link, actorId);
    if (link.entityType === "artist") return this.applyAssetToArtist(asset, link, actorId);
    return { updatedMediaAsset: asset, updatedEntity: undefined };
  }

  private async applyAssetToRelease(asset: MediaAsset, link: MediaAssetLink, actorId?: string) {
    const release = await releaseRepository.get(link.entityId);
    if (!release) return { updatedMediaAsset: asset, updatedEntity: undefined };
    const storageObject = await this.getPrimaryStorageObject(asset);
    const storageObjectId = storageObject?.storageObjectId ?? metadataString(asset.metadata, "storageObjectId");
    const field = link.fieldKey;
    const patch: Record<string, unknown> = { updatedBy: actorId };
    const metadata = { ...(release.metadata ?? {}) };
    if (field === "coverArtUrl" || field === "coverArtThumbnailUrl" || field === "coverArtLargeUrl") {
      const resolved = await this.resolvePublicDeliveryUrl(asset, field, actorId);
      patch.coverArtUrl = resolved.url;
      patch.coverArtThumbnailUrl = isPublicDeliveryUrl(resolved.asset.thumbnailUrl) ? resolved.asset.thumbnailUrl : resolved.url;
      patch.coverArtLargeUrl = isPublicDeliveryUrl(resolved.asset.largeUrl) ? resolved.asset.largeUrl : resolved.url;
      Object.assign(metadata, {
        coverArtAssetId: asset.assetId,
        coverArtStorageObjectId: storageObjectId ?? null,
        coverArtPublicStorageObjectId: metadataString(resolved.asset.metadata, "publicStorageObjectId") ?? null,
        pendingReleaseCoverArtAssignment: false,
      });
      const updated = await releaseRepository.update(link.entityId, { ...patch, metadata });
      return { updatedMediaAsset: resolved.asset, updatedEntity: updated };
    }
    if (field === "audioPreviewUrl") {
      const resolved = await this.resolvePublicDeliveryUrl(asset, field, actorId);
      patch.audioPreviewUrl = resolved.url;
      Object.assign(metadata, {
        audioPreviewAssetId: asset.assetId,
        audioPreviewStorageObjectId: storageObjectId ?? null,
        audioPreviewPublicStorageObjectId: metadataString(resolved.asset.metadata, "publicStorageObjectId") ?? null,
        pendingAudioPreviewAssignment: false,
      });
      const updated = await releaseRepository.update(link.entityId, { ...patch, metadata });
      return { updatedMediaAsset: resolved.asset, updatedEntity: updated };
    }
    if (field === "fullSongUrl") {
      Object.assign(metadata, {
        fullSongAssetId: asset.assetId,
        fullSongStorageObjectId: storageObjectId ?? null,
        fullSongMimeType: storageObject?.mimeType ?? null,
        fullSongFileSizeBytes: storageObject?.fileSizeBytes ?? null,
        fullSongOriginalFileName: storageObject?.originalFileName ?? storageObject?.fileName ?? null,
        fullSongPublicPlaybackAllowed: false,
        pendingFullSongAssignment: false,
      });
      const updated = await releaseRepository.update(link.entityId, { ...patch, metadata });
      return { updatedMediaAsset: asset, updatedEntity: updated };
    }
    const updated = await releaseRepository.update(link.entityId, { ...patch, metadata: { ...metadata, [`${field}AssetId`]: asset.assetId, [`${field}StorageObjectId`]: storageObjectId ?? null } });
    return { updatedMediaAsset: asset, updatedEntity: updated };
  }

  private async applyAssetToArtist(asset: MediaAsset, link: MediaAssetLink, actorId?: string) {
    const artist = await artistRepository.get(link.entityId);
    if (!artist) return { updatedMediaAsset: asset, updatedEntity: undefined };
    const storageObject = await this.getPrimaryStorageObject(asset);
    const storageObjectId = storageObject?.storageObjectId ?? metadataString(asset.metadata, "storageObjectId");
    const field = link.fieldKey;
    const metadata = { ...(artist.metadata ?? {}) };
    const patch: Record<string, unknown> = { updatedBy: actorId };
    if (field === "profileImage" || field === "profileThumbnailUrl" || field === "profileBannerUrl" || field === "characterArtUrl") {
      const resolved = await this.resolvePublicDeliveryUrl(asset, field, actorId);
      if (field === "profileImage") patch.profileImage = resolved.url;
      if (field === "profileThumbnailUrl") patch.profileThumbnailUrl = resolved.url;
      if (field === "profileBannerUrl") patch.profileBannerUrl = resolved.url;
      if (field === "characterArtUrl") patch.publicCharacterArtUrl = resolved.url;
      Object.assign(metadata, {
        [`${field}AssetId`]: asset.assetId,
        [`${field}StorageObjectId`]: storageObjectId ?? null,
        [`${field}PublicStorageObjectId`]: metadataString(resolved.asset.metadata, "publicStorageObjectId") ?? null,
        pendingArtistArtworkAssignment: false,
      });
      const updated = await artistRepository.update(link.entityId, { ...patch, metadata });
      return { updatedMediaAsset: resolved.asset, updatedEntity: updated };
    }
    const updated = await artistRepository.update(link.entityId, { ...patch, metadata: { ...metadata, [`${field}AssetId`]: asset.assetId, [`${field}StorageObjectId`]: storageObjectId ?? null } });
    return { updatedMediaAsset: asset, updatedEntity: updated };
  }
}

export const mediaLibraryService = new MediaLibraryService();
