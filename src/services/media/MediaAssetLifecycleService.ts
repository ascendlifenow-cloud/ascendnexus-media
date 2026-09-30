import type { MediaAssetMetadataValue, MediaAssetRecord, MediaAssetStatus } from "../../models/admin";
import type {
  MediaAssetDependency,
  MediaDeletionPolicy,
  MediaDeletionReadiness,
  MediaLifecycleActionType,
} from "../../models/media";
import { adminMediaService, recordMediaAuditEvent } from "../admin";
import { mediaStorageService } from "../storage";
import { createApiError, createApiSuccess, type ApiResult } from "../api/httpClient";
import { mediaAssetLinkingService } from "./MediaAssetLinkingService";
import { mediaAssetVersionService } from "./MediaAssetVersionService";
import { getMediaAssetDependencies } from "../../utils/media/mediaDependencyUtils";
import {
  buildMediaDeletionReadiness,
  defaultMediaDeletionPolicy,
  formatMediaLifecycleStatus,
  isMediaAssetSoftDeleted,
} from "../../utils/media/mediaLifecycleUtils";

export interface MediaAssetLifecycleOptions {
  reason?: string;
  detachLinkedAssets?: boolean;
  confirmPublicImpact?: boolean;
  allowHardDelete?: boolean;
  metadata?: Record<string, MediaAssetMetadataValue>;
}

export interface MediaAssetLifecycleResult {
  success: boolean;
  assetId: string;
  asset?: MediaAssetRecord;
  readiness?: MediaDeletionReadiness;
  dependencies?: MediaAssetDependency[];
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, MediaAssetMetadataValue>;
}

const nowIso = () => new Date().toISOString();

const getStorageObjectIds = (asset: MediaAssetRecord): string[] => {
  const ids = new Set<string>();
  const storage = asset.metadata?.storage;
  if (storage && typeof storage === "object" && !Array.isArray(storage) && typeof storage.storageObjectId === "string") {
    ids.add(storage.storageObjectId);
  }
  const history = mediaAssetVersionService.getVersionHistory(asset.assetId);
  history?.versions.forEach((version) => ids.add(version.storageObjectId));
  return [...ids];
};

const getPreviousStatus = (asset: MediaAssetRecord): MediaAssetStatus =>
  asset.metadata?.previousLifecycleStatus === "published" || asset.metadata?.previousLifecycleStatus === "draft"
    ? asset.metadata.previousLifecycleStatus
    : "draft";

export class MediaAssetLifecycleService {
  getDeletionPolicy(_asset?: MediaAssetRecord | null): MediaDeletionPolicy {
    return defaultMediaDeletionPolicy;
  }

  async getAssetDependencies(assetId: string): Promise<MediaAssetDependency[]> {
    const asset = await adminMediaService.getMediaAsset(assetId);
    if (!asset.ok) return [];
    return getMediaAssetDependencies(asset.data, mediaAssetLinkingService.getAssetLinks(assetId));
  }

  async checkDeletionReadiness(assetId: string, actionType: MediaLifecycleActionType): Promise<MediaDeletionReadiness> {
    const asset = await adminMediaService.getMediaAsset(assetId);
    if (!asset.ok) {
      return {
        assetId,
        actionType,
        allowed: false,
        blockingDependencies: [],
        warnings: [asset.error.message],
        safeToArchive: false,
        safeToDelete: false,
        publiclyReferenced: false,
        linkedCount: 0,
        activeVersionCount: 0,
        checkedAt: nowIso(),
        metadata: { missingAsset: true },
      };
    }
    const dependencies = await this.getAssetDependencies(assetId);
    const activeVersionCount = mediaAssetVersionService.listVersions(assetId).filter((version) => version.status === "active").length;
    return buildMediaDeletionReadiness(asset.data, actionType, dependencies, this.getDeletionPolicy(asset.data), activeVersionCount);
  }

  async archiveMediaAsset(assetId: string, options: MediaAssetLifecycleOptions = {}): Promise<MediaAssetLifecycleResult> {
    const asset = await adminMediaService.getMediaAsset(assetId);
    if (!asset.ok) return { success: false, assetId, errors: [asset.error.message] };
    const dependencies = await this.getAssetDependencies(assetId);
    const readiness = await this.checkDeletionReadiness(assetId, "archive");
    if (!readiness.allowed) {
      this.recordLifecycleAuditEvent("archive_blocked", asset.data, { success: false, assetId, readiness, dependencies, errors: readiness.warnings });
      return { success: false, assetId, readiness, dependencies, errors: ["Archive is blocked until public dependencies are detached or replaced."], warnings: readiness.warnings };
    }
    const updated = await adminMediaService.updateMediaAsset(assetId, {
      status: "archived",
      metadata: {
        ...(asset.data.metadata ?? {}),
        previousLifecycleStatus: asset.data.status,
        archivedAt: nowIso(),
        archivedReason: options.reason ?? null,
        lifecycleStatus: "archived",
        visibilityOverride: "not_public",
        ...(options.metadata ?? {}),
      },
    });
    if (!updated.ok) return { success: false, assetId, readiness, dependencies, errors: [updated.error.message] };
    const result = { success: true, assetId, asset: updated.data, readiness, dependencies, warnings: readiness.warnings };
    this.recordLifecycleAuditEvent("archive", updated.data, result);
    return result;
  }

  async restoreMediaAsset(assetId: string, options: MediaAssetLifecycleOptions = {}): Promise<MediaAssetLifecycleResult> {
    const asset = await adminMediaService.getMediaAsset(assetId);
    if (!asset.ok) return { success: false, assetId, errors: [asset.error.message] };
    const dependencies = await this.getAssetDependencies(assetId);
    const readiness = await this.checkDeletionReadiness(assetId, "restore");
    if (!readiness.allowed) return { success: false, assetId, readiness, dependencies, errors: ["Restore is only available for archived, non-deleted assets."], warnings: readiness.warnings };
    const restoreStatus = options.confirmPublicImpact ? getPreviousStatus(asset.data) : "draft";
    const updated = await adminMediaService.updateMediaAsset(assetId, {
      status: restoreStatus,
      metadata: {
        ...(asset.data.metadata ?? {}),
        restoredAt: nowIso(),
        restoredReason: options.reason ?? null,
        lifecycleStatus: "restored",
        deletedAt: null,
        deletedReason: null,
        ...(options.metadata ?? {}),
      },
    });
    if (!updated.ok) return { success: false, assetId, readiness, dependencies, errors: [updated.error.message] };
    const result = { success: true, assetId, asset: updated.data, readiness, dependencies, warnings: readiness.warnings };
    this.recordLifecycleAuditEvent("restore", updated.data, result);
    return result;
  }

  async softDeleteMediaAsset(assetId: string, options: MediaAssetLifecycleOptions = {}): Promise<MediaAssetLifecycleResult> {
    const asset = await adminMediaService.getMediaAsset(assetId);
    if (!asset.ok) return { success: false, assetId, errors: [asset.error.message] };
    const dependencies = await this.getAssetDependencies(assetId);
    const readiness = await this.checkDeletionReadiness(assetId, "soft_delete");
    if (!readiness.allowed) {
      this.recordLifecycleAuditEvent("delete_blocked", asset.data, { success: false, assetId, readiness, dependencies, errors: readiness.warnings });
      return { success: false, assetId, readiness, dependencies, errors: ["Soft delete is blocked by active dependencies or active versions."], warnings: readiness.warnings };
    }
    if (options.detachLinkedAssets) await this.detachBeforeDelete(assetId, options);
    const updated = await adminMediaService.updateMediaAsset(assetId, {
      status: "archived",
      metadata: {
        ...(asset.data.metadata ?? {}),
        previousLifecycleStatus: asset.data.status,
        deletedAt: nowIso(),
        deletedReason: options.reason ?? null,
        lifecycleStatus: "soft_deleted",
        hardDeleteReady: false,
        ...(options.metadata ?? {}),
      },
    });
    if (!updated.ok) return { success: false, assetId, readiness, dependencies, errors: [updated.error.message] };
    const result = { success: true, assetId, asset: updated.data, readiness, dependencies, warnings: readiness.warnings };
    this.recordLifecycleAuditEvent("soft_delete", updated.data, result);
    return result;
  }

  async deleteStorageObjects(assetId: string, options: MediaAssetLifecycleOptions = {}): Promise<MediaAssetLifecycleResult> {
    const asset = await adminMediaService.getMediaAsset(assetId);
    if (!asset.ok) return { success: false, assetId, errors: [asset.error.message] };
    const readiness = await this.checkDeletionReadiness(assetId, "hard_delete");
    if (!options.allowHardDelete || !readiness.allowed) {
      return { success: false, assetId, readiness, errors: ["Hard delete is disabled or blocked by lifecycle policy."], warnings: readiness.warnings };
    }
    const deletedIds: string[] = [];
    const errors: string[] = [];
    for (const storageObjectId of getStorageObjectIds(asset.data)) {
      const deleted = await mediaStorageService.deleteStorageObject(storageObjectId);
      if (deleted.success) deletedIds.push(storageObjectId);
      else errors.push(...(deleted.errors ?? [`Storage object ${storageObjectId} could not be deleted.`]));
    }
    const result = { success: errors.length === 0, assetId, asset: asset.data, readiness, errors, metadata: { deletedStorageObjectIds: deletedIds.join(",") } };
    this.recordLifecycleAuditEvent(errors.length ? "storage_delete_failed" : "storage_deleted", asset.data, result);
    return result;
  }

  async detachBeforeDelete(assetId: string, _options: MediaAssetLifecycleOptions = {}): Promise<MediaAssetLifecycleResult> {
    const links = mediaAssetLinkingService.getAssetLinks(assetId).filter((link) => link.status === "active");
    const errors: string[] = [];
    for (const link of links) {
      const detached = await mediaAssetLinkingService.detachAssetFromEntity(link.linkId, { updateEntityField: false });
      if (!detached.ok) errors.push(detached.error.message);
    }
    return { success: errors.length === 0, assetId, errors, metadata: { detachedCount: links.length } };
  }

  recordLifecycleAuditEvent(action: string, asset: MediaAssetRecord, result: MediaAssetLifecycleResult): void {
    const actionType = action === "archive" ? "archive" : action === "restore" ? "restore" : action.includes("delete") ? "delete" : "custom";
    recordMediaAuditEvent({
      actionType,
      entityId: asset.assetId,
      entityLabel: asset.title,
      route: `/admin/media/${asset.assetId}/edit`,
      summary: this.getAuditSummary(action, asset, result),
      after: result.asset ?? asset,
      metadata: {
        action,
        success: result.success,
        publiclyReferenced: result.readiness?.publiclyReferenced ?? false,
        linkedCount: result.readiness?.linkedCount ?? 0,
        blockingDependencyCount: result.readiness?.blockingDependencies.length ?? 0,
      },
    });
  }

  async getLifecycleStatus(assetId: string): Promise<ApiResult<{ status: string; readiness: MediaDeletionReadiness; dependencies: MediaAssetDependency[] }>> {
    const asset = await adminMediaService.getMediaAsset(assetId);
    if (!asset.ok) return createApiError(asset.error.code, asset.error.message, asset.error.status);
    const dependencies = await this.getAssetDependencies(assetId);
    const readiness = await this.checkDeletionReadiness(assetId, isMediaAssetSoftDeleted(asset.data) ? "hard_delete" : asset.data.status === "archived" ? "restore" : "archive");
    return createApiSuccess({ status: formatMediaLifecycleStatus(asset.data), readiness, dependencies });
  }

  private getAuditSummary(action: string, asset: MediaAssetRecord, result: MediaAssetLifecycleResult): string {
    if (action === "archive") return `Archived media asset "${asset.title}"`;
    if (action === "restore") return `Restored media asset "${asset.title}"`;
    if (action === "soft_delete") return `Soft deleted media asset "${asset.title}"`;
    if (action === "delete_blocked" || action === "archive_blocked") return `Blocked lifecycle action for media asset "${asset.title}"`;
    if (action === "storage_deleted") return `Deleted storage objects for media asset "${asset.title}"`;
    if (action === "storage_delete_failed") return `Storage delete failed for media asset "${asset.title}"`;
    return result.success ? `Updated lifecycle for media asset "${asset.title}"` : `Lifecycle action failed for media asset "${asset.title}"`;
  }
}

export const mediaAssetLifecycleService = new MediaAssetLifecycleService();

