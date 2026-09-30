import type { MediaAssetMetadataValue } from "../../models/admin";
import type {
  MediaAssignmentReviewItem,
  MediaAssignmentReviewState,
  MediaAssetLinkEntityType,
  MediaAssetLinkFieldKey,
  MediaAssetLinkIntendedUse,
} from "../../models/media";
import type { ApiResult } from "../api/httpClient";
import { createApiError, createApiSuccess } from "../api/httpClient";
import { adminMediaService, recordMediaAuditEvent } from "../admin";
import { dispatchMediaAssignmentChanged } from "./MediaAssignmentEvents";
import { mediaAssetLinkingService } from "./MediaAssetLinkingService";
import {
  buildReviewItemFromMediaAsset,
  filterMediaReviewItems,
  getMediaAssignmentSuggestion,
  getMediaReviewQueueStats,
  shouldIncludeAssetInReviewQueue,
  sortMediaReviewItems,
  type MediaReviewFilters,
  type MediaReviewQueueStats,
} from "../../utils/media/mediaAssignmentReviewUtils";

export interface MediaReviewAssignmentInput {
  entityType: MediaAssetLinkEntityType;
  entityId: string;
  fieldKey: MediaAssetLinkFieldKey;
  intendedUse: MediaAssetLinkIntendedUse;
  replaceExisting?: boolean;
  updateEntityField?: boolean;
}

const nowIso = (): string => new Date().toISOString();

const mergeMetadata = (
  current: Record<string, MediaAssetMetadataValue> | undefined,
  patch: Record<string, MediaAssetMetadataValue>,
) => ({ ...(current ?? {}), ...patch });

export class MediaAssignmentReviewService {
  private reviewItems = new Map<string, MediaAssignmentReviewItem>();
  private removedAssetIds = new Set<string>();

  async listReviewItems(filters: MediaReviewFilters = {}): Promise<ApiResult<MediaAssignmentReviewItem[]>> {
    await this.buildReviewQueueFromMediaAssets();
    const items = sortMediaReviewItems(filterMediaReviewItems([...this.reviewItems.values()], filters), filters.sortMode ?? "newest");
    return createApiSuccess(items);
  }

  async getReviewItem(reviewItemId: string): Promise<ApiResult<MediaAssignmentReviewItem>> {
    await this.buildReviewQueueFromMediaAssets();
    const item = this.reviewItems.get(reviewItemId);
    return item ? createApiSuccess(item) : createApiError("not_found", "Review item was not found.", 404);
  }

  async buildReviewQueueFromMediaAssets(): Promise<ApiResult<MediaAssignmentReviewItem[]>> {
    const assets = await adminMediaService.listMediaAssets();
    if (!assets.ok) return createApiError(assets.error.code, assets.error.message, assets.error.status);
    const activeAssets = assets.data.filter((asset) => !this.removedAssetIds.has(asset.assetId));
    const included = activeAssets.filter(shouldIncludeAssetInReviewQueue);
    const currentAssetIds = new Set(activeAssets.map((asset) => asset.assetId));
    included.forEach((asset) => {
      const existing = this.reviewItems.get(`media-review-${asset.assetId}`);
      if (existing && existing.status !== "pending" && existing.status !== "in_review") return;
      this.reviewItems.set(`media-review-${asset.assetId}`, {
        ...buildReviewItemFromMediaAsset(asset),
        status: existing?.status ?? buildReviewItemFromMediaAsset(asset).status,
        assignmentState: existing?.assignmentState ?? buildReviewItemFromMediaAsset(asset).assignmentState,
      });
    });
    for (const [reviewItemId, item] of this.reviewItems) {
      if (!currentAssetIds.has(item.assetId)) {
        this.reviewItems.delete(reviewItemId);
      } else if (!included.some((asset) => asset.assetId === item.assetId)) {
        this.reviewItems.delete(reviewItemId);
      }
    }
    this.recordReviewAudit("media_review_queue_refreshed", "media-review-queue", "Media assignment review queue refreshed", { totalItems: this.reviewItems.size });
    return createApiSuccess([...this.reviewItems.values()]);
  }

  async getUnassignedAssets() {
    const assets = await adminMediaService.listMediaAssets();
    return assets.ok ? createApiSuccess(assets.data.filter(shouldIncludeAssetInReviewQueue)) : assets;
  }

  async getRecentlyUploadedUnassignedAssets() {
    const result = await this.getUnassignedAssets();
    if (!result.ok) return result;
    return createApiSuccess(result.data.filter((asset) => asset.createdAt && Date.now() - Date.parse(asset.createdAt) < 1000 * 60 * 60 * 24 * 7));
  }

  async suggestAssignment(assetId: string) {
    const asset = await adminMediaService.getMediaAsset(assetId);
    return asset.ok ? createApiSuccess(getMediaAssignmentSuggestion(asset.data)) : asset;
  }

  async markInReview(reviewItemId: string): Promise<ApiResult<MediaAssignmentReviewItem>> {
    return this.patchReviewItem(reviewItemId, { status: "in_review" });
  }

  async markResolved(reviewItemId: string): Promise<ApiResult<MediaAssignmentReviewItem>> {
    return this.patchReviewItem(reviewItemId, { status: "resolved", assignmentState: "assigned" });
  }

  async markKeptUnassigned(reviewItemId: string): Promise<ApiResult<MediaAssignmentReviewItem>> {
    const item = this.reviewItems.get(reviewItemId);
    if (!item) return createApiError("not_found", "Review item was not found.", 404);
    await adminMediaService.updateMediaAsset(item.assetId, {
      metadata: mergeMetadata(item.asset.metadata, {
        assignmentStatus: "kept_unassigned",
        assignmentReviewStatus: "ignored",
        keptUnassignedAt: nowIso(),
      }),
    });
    const updated = await this.patchReviewItem(reviewItemId, { status: "ignored", assignmentState: "kept_unassigned" });
    this.recordReviewAudit("media_review_item_kept_unassigned", item.assetId, `Kept uploaded asset "${item.asset.title}" unassigned`);
    return updated;
  }

  async archiveReviewItem(reviewItemId: string): Promise<ApiResult<MediaAssignmentReviewItem>> {
    const item = this.reviewItems.get(reviewItemId);
    if (!item) return createApiError("not_found", "Review item was not found.", 404);
    const archiveResult = await adminMediaService.archiveMediaAsset(item.assetId);
    if (!archiveResult.ok) return createApiError(archiveResult.error.code, archiveResult.error.message, archiveResult.error.status);
    const updated = await this.patchReviewItem(reviewItemId, { status: "archived", assignmentState: "archived", asset: archiveResult.data });
    this.recordReviewAudit("media_review_item_archived", item.assetId, `Archived unassigned uploaded asset "${item.asset.title}"`);
    return updated;
  }

  async deleteReviewItem(reviewItemId: string): Promise<ApiResult<{ reviewItemId: string; assetId: string }>> {
    const item = this.reviewItems.get(reviewItemId);
    if (!item) return createApiError("not_found", "Review item was not found.", 404);
    const deleteResult = await adminMediaService.deleteMediaAsset(item.assetId);
    if (!deleteResult.ok) return createApiError(deleteResult.error.code, deleteResult.error.message, deleteResult.error.status);
    this.removedAssetIds.add(item.assetId);
    this.reviewItems.delete(reviewItemId);
    this.recordReviewAudit("media_review_item_hard_deleted", item.assetId, `Hard deleted uploaded asset "${item.asset.title}" from media review`);
    return createApiSuccess({ reviewItemId, assetId: item.assetId });
  }

  removeAssetFromReviewQueue(assetId: string): void {
    this.removedAssetIds.add(assetId);
    for (const [reviewItemId, item] of this.reviewItems) {
      if (item.assetId === assetId) this.reviewItems.delete(reviewItemId);
    }
  }

  async bulkDeleteReviewItems(reviewItemIds: string[]): Promise<ApiResult<Array<{ reviewItemId: string; assetId: string }>>> {
    const results = await Promise.all(reviewItemIds.map((id) => this.deleteReviewItem(id)));
    return createApiSuccess(results.filter((result): result is ApiResult<{ reviewItemId: string; assetId: string }> & { ok: true } => result.ok).map((result) => result.data));
  }

  async assignAssetFromReview(reviewItemId: string, assignment: MediaReviewAssignmentInput): Promise<ApiResult<MediaAssignmentReviewItem>> {
    const item = this.reviewItems.get(reviewItemId);
    if (!item) return createApiError("not_found", "Review item was not found.", 404);
    if (!assignment.entityId.trim()) return createApiError("validation_error", "Entity ID is required before assignment.", 400);
    const compatibility = mediaAssetLinkingService.validateAssetCompatibility(item.asset, assignment.entityType, assignment.fieldKey, assignment.intendedUse);
    if (!compatibility.compatible) {
      const failed = await this.patchReviewItem(reviewItemId, {
        status: "pending",
        assignmentState: "assignment_failed",
        reason: compatibility.blockingIssues.join(" "),
        metadata: mergeMetadata(item.metadata, { assignmentError: compatibility.blockingIssues.join(" ") }),
      });
      this.recordReviewAudit("media_review_assignment_failed", item.assetId, `Assignment failed for uploaded asset "${item.asset.title}"`, { errors: compatibility.blockingIssues.join("; ") });
      return failed.ok ? createApiError("validation_error", compatibility.blockingIssues.join(" "), 400) : failed;
    }

    const linkResult = await adminMediaService.linkMediaAsset(item.assetId, {
      entityType: assignment.entityType,
      entityId: assignment.entityId,
      fieldKey: assignment.fieldKey,
      intendedUse: assignment.intendedUse,
      updateEntityField: assignment.updateEntityField ?? true,
      metadata: {
        reviewItemId,
        assignmentSource: "media_review_queue",
        confidence: item.confidence ?? null,
      },
    });
    if (!linkResult.ok) {
      await this.patchReviewItem(reviewItemId, {
        status: "pending",
        assignmentState: "assignment_failed",
        reason: linkResult.error.message,
        metadata: mergeMetadata(item.metadata, { assignmentError: linkResult.error.message }),
      });
      this.recordReviewAudit("media_review_assignment_failed", item.assetId, `Assignment failed for uploaded asset "${item.asset.title}"`, { error: linkResult.error.message });
      return createApiError(linkResult.error.code, linkResult.error.message, linkResult.error.status);
    }

    const assetUpdate = await adminMediaService.updateMediaAsset(item.assetId, {
      ownerType: assignment.entityType === "artist" || assignment.entityType === "release" ? assignment.entityType : item.asset.ownerType,
      ownerId: assignment.entityId,
      metadata: mergeMetadata(item.asset.metadata, {
        assignmentStatus: "assigned",
        assignmentReviewStatus: "resolved",
        assignedEntityType: assignment.entityType,
        assignedEntityId: assignment.entityId,
        assignedFieldKey: assignment.fieldKey,
        mediaAssetLinkId: linkResult.data.link.linkId,
      }),
    });
    const updatedAsset = assetUpdate.ok ? assetUpdate.data : linkResult.data.mediaAsset ?? item.asset;
    const updated = await this.patchReviewItem(reviewItemId, {
      status: "resolved",
      assignmentState: "assigned",
      asset: updatedAsset,
      reason: `Assigned to ${assignment.entityType} ${assignment.entityId}.`,
    });
    dispatchMediaAssignmentChanged({
      assetId: item.assetId,
      entityType: assignment.entityType,
      entityId: assignment.entityId,
      fieldKey: assignment.fieldKey,
      mediaAsset: updatedAsset,
      source: "media_review",
    });
    this.recordReviewAudit("media_review_item_assigned", item.assetId, `Assigned uploaded asset "${item.asset.title}" to ${assignment.entityType} "${assignment.entityId}"`);
    return updated;
  }

  async bulkMarkKeptUnassigned(reviewItemIds: string[]): Promise<ApiResult<MediaAssignmentReviewItem[]>> {
    const results = await Promise.all(reviewItemIds.map((id) => this.markKeptUnassigned(id)));
    return createApiSuccess(results.filter((result): result is ApiResult<MediaAssignmentReviewItem> & { ok: true } => result.ok).map((result) => result.data));
  }

  async bulkArchiveReviewItems(reviewItemIds: string[]): Promise<ApiResult<MediaAssignmentReviewItem[]>> {
    const results = await Promise.all(reviewItemIds.map((id) => this.archiveReviewItem(id)));
    return createApiSuccess(results.filter((result): result is ApiResult<MediaAssignmentReviewItem> & { ok: true } => result.ok).map((result) => result.data));
  }

  getReviewStats(): MediaReviewQueueStats {
    return getMediaReviewQueueStats([...this.reviewItems.values()]);
  }

  private async patchReviewItem(
    reviewItemId: string,
    patch: Partial<MediaAssignmentReviewItem> & { assignmentState?: MediaAssignmentReviewState },
  ): Promise<ApiResult<MediaAssignmentReviewItem>> {
    const current = this.reviewItems.get(reviewItemId);
    if (!current) return createApiError("not_found", "Review item was not found.", 404);
    const updated: MediaAssignmentReviewItem = { ...current, ...patch, updatedAt: nowIso() };
    this.reviewItems.set(reviewItemId, updated);
    return createApiSuccess(updated);
  }

  private recordReviewAudit(action: string, entityId: string, summary: string, metadata: Record<string, MediaAssetMetadataValue> = {}): void {
    recordMediaAuditEvent({
      actionType: action.includes("archive") ? "archive" : action.includes("failed") ? "validate" : "update",
      entityId,
      entityLabel: "Media assignment review",
      route: "/admin/media/review",
      summary,
      metadata: { action, ...metadata },
    });
  }
}

export const mediaAssignmentReviewService = new MediaAssignmentReviewService();
