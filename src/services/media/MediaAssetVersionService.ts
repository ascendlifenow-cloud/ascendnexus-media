import type { MediaAssetRecord, UpdateMediaAssetDto } from "../../models/admin";
import type {
  MediaAssetReplaceOptions,
  MediaAssetReplaceResult,
  MediaAssetVersion,
  MediaAssetVersionHistory,
  MediaStorageObject,
  MediaUploadTarget,
} from "../../models/media";
import { adminMediaService, recordMediaAuditEvent } from "../admin";
import { mediaAssetLinkingService } from "./MediaAssetLinkingService";
import { mediaAssetUploadService } from "./MediaAssetUploadService";
import { mediaAssetVisibilityService } from "./MediaAssetVisibilityService";
import {
  buildVersionFromAsset,
  compareMediaVersions,
  getActiveMediaVersion,
  getNextVersionNumber,
  getVersionUrlFromStorage,
  serializeVersionHistoryMetadata,
  summarizeVersionHistory,
} from "../../utils/media/mediaVersionUtils";

const defaults: Required<Pick<MediaAssetReplaceOptions, "preserveOldVersion" | "updateActiveLinks" | "updatePublicFields" | "runValidation" | "runVisibilityCheck" | "createAuditEvent">> = {
  preserveOldVersion: true,
  updateActiveLinks: true,
  updatePublicFields: true,
  runValidation: true,
  runVisibilityCheck: true,
  createAuditEvent: true,
};

const asVersionHistory = (asset: MediaAssetRecord): MediaAssetVersionHistory | null => {
  const history = asset.metadata?.versionHistory;
  if (!history || typeof history !== "object" || Array.isArray(history)) return null;
  const versions = Array.isArray(history.versions) ? history.versions as unknown as MediaAssetVersion[] : [];
  const activeVersionId = typeof history.activeVersionId === "string" ? history.activeVersionId : versions.find((version) => version.status === "active")?.versionId;
  if (!activeVersionId) return null;
  return {
    assetId: asset.assetId,
    activeVersionId,
    versions,
    createdAt: typeof history.createdAt === "string" ? history.createdAt : asset.createdAt ?? new Date().toISOString(),
    updatedAt: typeof history.updatedAt === "string" ? history.updatedAt : asset.updatedAt,
    metadata: typeof history.metadata === "object" && history.metadata && !Array.isArray(history.metadata)
      ? history.metadata as Record<string, string | number | boolean | null>
      : undefined,
  };
};

export class MediaAssetVersionService {
  private histories = new Map<string, MediaAssetVersionHistory>();

  createInitialVersion(mediaAsset: MediaAssetRecord, storageObject?: MediaStorageObject): MediaAssetVersion {
    const existingHistory = this.getVersionHistorySync(mediaAsset.assetId) ?? asVersionHistory(mediaAsset);
    const existingActive = getActiveMediaVersion(existingHistory);
    if (existingActive) return existingActive;
    const version = buildVersionFromAsset(mediaAsset, 1, storageObject, "Initial media asset version");
    const history: MediaAssetVersionHistory = {
      assetId: mediaAsset.assetId,
      activeVersionId: version.versionId,
      versions: [version],
      createdAt: mediaAsset.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.histories.set(mediaAsset.assetId, history);
    return version;
  }

  async createReplacementVersion(
    assetId: string,
    file: File,
    uploadTarget: MediaUploadTarget,
    options: MediaAssetReplaceOptions = {},
  ): Promise<MediaAssetReplaceResult> {
    return this.replaceAssetFile(assetId, file, uploadTarget, options);
  }

  getVersionHistory(assetId: string): MediaAssetVersionHistory | null {
    return this.getVersionHistorySync(assetId);
  }

  getActiveVersion(assetId: string): MediaAssetVersion | null {
    return getActiveMediaVersion(this.getVersionHistorySync(assetId)) ?? null;
  }

  listVersions(assetId: string): MediaAssetVersion[] {
    return this.getVersionHistorySync(assetId)?.versions ?? [];
  }

  async replaceAssetFile(
    assetId: string,
    file: File,
    uploadTarget: MediaUploadTarget,
    options: MediaAssetReplaceOptions = {},
  ): Promise<MediaAssetReplaceResult> {
    const resolvedOptions = { ...defaults, ...options };
    const currentResult = await adminMediaService.getMediaAsset(assetId);
    if (!currentResult.ok) return { success: false, assetId, errors: [currentResult.error.message] };
    const currentAsset = currentResult.data;
    const history = this.ensureHistory(currentAsset);
    const previousActive = getActiveMediaVersion(history) ?? this.createInitialVersion(currentAsset);

    const uploadResult = await mediaAssetUploadService.uploadMediaAsset(file, { ...uploadTarget, assetType: currentAsset.assetType }, {
      generateAssetRecord: false,
      accessLevel: uploadTarget.accessLevel,
      metadata: {
        ...(uploadTarget.metadata ?? {}),
        replacementForAssetId: assetId,
        changeReason: options.changeReason ?? null,
      },
    });

    if (!uploadResult.success || !uploadResult.storageObject) {
      return {
        success: false,
        assetId,
        previousVersion: previousActive,
        errors: uploadResult.errors ?? ["Replacement upload failed."],
        warnings: uploadResult.warnings,
      };
    }

    const nextVersionNumber = getNextVersionNumber(history);
    const newVersion = buildVersionFromAsset(
      {
        ...currentAsset,
        url: getVersionUrlFromStorage(uploadResult.storageObject),
        thumbnailUrl: uploadResult.storageObject.mediaCategory === "image" ? uploadResult.storageObject.publicUrl : currentAsset.thumbnailUrl,
        largeUrl: uploadResult.storageObject.mediaCategory === "image" ? uploadResult.storageObject.publicUrl : currentAsset.largeUrl,
      },
      nextVersionNumber,
      uploadResult.storageObject,
      options.changeReason,
      options.createdBy,
    );

    const candidateAsset: MediaAssetRecord = {
      ...currentAsset,
      url: newVersion.url,
      thumbnailUrl: newVersion.thumbnailUrl,
      largeUrl: newVersion.largeUrl,
      metadata: {
        ...(currentAsset.metadata ?? {}),
        storage: {
          storageObjectId: uploadResult.storageObject.storageObjectId,
          provider: uploadResult.storageObject.provider,
          bucket: uploadResult.storageObject.bucket ?? null,
          storagePath: uploadResult.storageObject.storagePath,
          accessLevel: uploadResult.storageObject.accessLevel,
          status: uploadResult.storageObject.status,
          checksum: uploadResult.storageObject.checksum ?? null,
        },
      },
    };
    const visibility = mediaAssetVisibilityService.getAssetVisibility(candidateAsset, { requireAssignment: false });
    const activeLinks = mediaAssetLinkingService.getAssetLinks(assetId).filter((link) => link.status === "active");
    const isPubliclyReferenced = activeLinks.length > 0 && currentAsset.status === "published";
    const warnings = [...(uploadResult.warnings ?? [])];
    if (isPubliclyReferenced && resolvedOptions.runVisibilityCheck && !visibility.publicAllowed) {
      warnings.push("Replacement uploaded, but public fields were not updated because the new version is not public-ready.");
    }

    const canUpdatePublicFields = !isPubliclyReferenced || !resolvedOptions.runVisibilityCheck || visibility.publicAllowed;
    const shouldUpdateUrls = resolvedOptions.updatePublicFields && canUpdatePublicFields;
    const updatedHistory = this.applyNewVersion(history, previousActive, newVersion, resolvedOptions.preserveOldVersion);
    const previousVersionIds = updatedHistory.versions
      .filter((version) => version.versionId !== newVersion.versionId)
      .map((version) => version.versionId);
    const patch: UpdateMediaAssetDto = {
      ...(shouldUpdateUrls ? {
        url: newVersion.url,
        thumbnailUrl: newVersion.thumbnailUrl,
        largeUrl: newVersion.largeUrl,
      } : {}),
      metadata: {
        ...(currentAsset.metadata ?? {}),
        versionHistory: serializeVersionHistoryMetadata(updatedHistory),
        activeVersionId: newVersion.versionId,
        previousVersionIds: previousVersionIds.join(","),
        lastReplaceReason: options.changeReason ?? null,
        replacementVisibility: visibility.visibility,
      },
    };

    const updatedAssetResult = await adminMediaService.updateMediaAsset(assetId, patch);
    if (!updatedAssetResult.ok) {
      return {
        success: false,
        assetId,
        previousVersion: previousActive,
        newVersion,
        warnings,
        errors: [updatedAssetResult.error.message],
      };
    }

    let updatedLinks = activeLinks;
    if (resolvedOptions.updateActiveLinks && shouldUpdateUrls) {
      updatedLinks = [];
      for (const link of activeLinks) {
        const result = await mediaAssetLinkingService.applyLinkedAssetToEntity(updatedAssetResult.data, link.entityType, link.entityId, link.fieldKey, {
          intendedUse: link.intendedUse,
          updateEntityField: true,
          replaceExisting: false,
          preservePreviousLink: true,
          publicSafetyCheck: true,
          metadata: { activeVersionId: newVersion.versionId },
        });
        if (!result.ok) warnings.push(`Linked ${link.fieldKey} was not updated: ${result.error.message}`);
        updatedLinks.push({ ...link, metadata: { ...(link.metadata ?? {}), activeVersionId: newVersion.versionId } });
      }
    } else if (activeLinks.length) {
      warnings.push("Active links were not updated; linked entities may still reference the previous URL.");
    }

    if (resolvedOptions.createAuditEvent) {
      recordMediaAuditEvent({
        actionType: "replace",
        entityId: assetId,
        entityLabel: currentAsset.title,
        route: `/admin/media/${assetId}/edit`,
        summary: `Replaced media asset "${currentAsset.title}"`,
        metadata: {
          assetId,
          previousVersionId: previousActive.versionId,
          newVersionId: newVersion.versionId,
          visibility: visibility.visibility,
          publicFieldsUpdated: shouldUpdateUrls,
        },
      });
    }

    return {
      success: true,
      assetId,
      previousVersion: previousActive,
      newVersion,
      updatedMediaAsset: updatedAssetResult.data,
      updatedLinks,
      warnings,
      metadata: {
        activeVersionId: newVersion.versionId,
        publicFieldsUpdated: shouldUpdateUrls,
        visibility: visibility.visibility,
        ...summarizeVersionHistory(updatedHistory),
      },
    };
  }

  async rollbackToVersion(
    assetId: string,
    versionId: string,
    options: MediaAssetReplaceOptions = {},
  ): Promise<MediaAssetReplaceResult> {
    const current = await adminMediaService.getMediaAsset(assetId);
    if (!current.ok) return { success: false, assetId, errors: [current.error.message] };
    const history = this.ensureHistory(current.data);
    const target = history.versions.find((version) => version.versionId === versionId);
    if (!target) return { success: false, assetId, errors: ["Media version was not found."] };
    const previousActive = getActiveMediaVersion(history);
    const updatedHistory: MediaAssetVersionHistory = {
      ...history,
      activeVersionId: target.versionId,
      versions: history.versions.map((version) => ({
        ...version,
        status: version.versionId === target.versionId ? "active" : version.status === "deleted" ? "deleted" : "rollback_available",
      })),
      updatedAt: new Date().toISOString(),
    };
    this.histories.set(assetId, updatedHistory);
    const updated = await adminMediaService.updateMediaAsset(assetId, {
      url: target.url,
      thumbnailUrl: target.thumbnailUrl,
      largeUrl: target.largeUrl,
      metadata: {
        ...(current.data.metadata ?? {}),
        versionHistory: serializeVersionHistoryMetadata(updatedHistory),
        activeVersionId: target.versionId,
        lastReplaceReason: options.changeReason ?? "Rollback",
      },
    });
    if (!updated.ok) return { success: false, assetId, previousVersion: previousActive, errors: [updated.error.message] };
    if (options.updateActiveLinks !== false) {
      const links = mediaAssetLinkingService.getAssetLinks(assetId).filter((link) => link.status === "active");
      for (const link of links) {
        await mediaAssetLinkingService.applyLinkedAssetToEntity(updated.data, link.entityType, link.entityId, link.fieldKey, {
          intendedUse: link.intendedUse,
          updateEntityField: true,
          replaceExisting: false,
          preservePreviousLink: true,
          publicSafetyCheck: true,
          metadata: { activeVersionId: target.versionId },
        });
      }
    }
    recordMediaAuditEvent({
      actionType: "restore",
      entityId: assetId,
      entityLabel: updated.data.title,
      route: `/admin/media/${assetId}/edit`,
      summary: `Rolled back media asset "${updated.data.title}" to version ${target.versionNumber}`,
      metadata: { assetId, versionId: target.versionId },
    });
    return { success: true, assetId, previousVersion: previousActive, newVersion: target, updatedMediaAsset: updated.data };
  }

  markVersionArchived(assetId: string, versionId: string): MediaAssetReplaceResult {
    const history = this.getVersionHistorySync(assetId);
    if (!history) return { success: false, assetId, errors: ["Version history was not found."] };
    if (history.activeVersionId === versionId) return { success: false, assetId, errors: ["Active version cannot be archived."] };
    const updated: MediaAssetVersionHistory = {
      ...history,
      versions: history.versions.map((version) => version.versionId === versionId ? { ...version, status: "archived" } : version),
      updatedAt: new Date().toISOString(),
    };
    this.histories.set(assetId, updated);
    return { success: true, assetId, metadata: { archivedVersionId: versionId } };
  }

  compareVersions(assetId: string, versionAId: string, versionBId: string): Record<string, string | number | boolean | null> | null {
    const versions = this.listVersions(assetId);
    const versionA = versions.find((version) => version.versionId === versionAId);
    const versionB = versions.find((version) => version.versionId === versionBId);
    if (!versionA || !versionB) return null;
    return compareMediaVersions(versionA, versionB);
  }

  private ensureHistory(asset: MediaAssetRecord): MediaAssetVersionHistory {
    const existing = this.getVersionHistorySync(asset.assetId) ?? asVersionHistory(asset);
    if (existing) {
      this.histories.set(asset.assetId, existing);
      return existing;
    }
    this.createInitialVersion(asset);
    return this.getVersionHistorySync(asset.assetId) as MediaAssetVersionHistory;
  }

  private getVersionHistorySync(assetId: string): MediaAssetVersionHistory | null {
    return this.histories.get(assetId) ?? null;
  }

  private applyNewVersion(
    history: MediaAssetVersionHistory,
    previousActive: MediaAssetVersion,
    newVersion: MediaAssetVersion,
    preserveOldVersion: boolean,
  ): MediaAssetVersionHistory {
    const previousVersions = preserveOldVersion
      ? history.versions.map((version) => version.versionId === previousActive.versionId
        ? { ...version, status: "replaced" as const, replacedByVersionId: newVersion.versionId }
        : version.status === "active"
          ? { ...version, status: "rollback_available" as const }
          : version)
      : history.versions.filter((version) => version.versionId !== previousActive.versionId);
    const updated: MediaAssetVersionHistory = {
      ...history,
      activeVersionId: newVersion.versionId,
      versions: [...previousVersions, newVersion],
      updatedAt: new Date().toISOString(),
    };
    this.histories.set(history.assetId, updated);
    return updated;
  }
}

export const mediaAssetVersionService = new MediaAssetVersionService();
