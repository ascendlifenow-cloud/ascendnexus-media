import type { MediaPublicationOperation } from "../../models/mediaModels";
import type { PublishedContentSyncStatus } from "../../models/public/PublishedContentSyncStatusModel";
import { jsonDatabase } from "../media/JsonDatabase";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { publicContentCacheService } from "./PublicContentCacheService";

export class PublishedContentSynchronizationService {
  async synchronizePublicationOperation(operation: MediaPublicationOperation): Promise<PublishedContentSyncStatus> {
    const now = new Date().toISOString();
    publicContentCacheService.invalidateEntity(operation.entityType, operation.entityId);
    if (operation.actionType === "unpublish" || operation.actionType === "archive") {
      publicContentCacheService.markHidden(operation.entityType, operation.entityId, String(operation.metadata?.slug ?? operation.entityId));
    }
    const status: PublishedContentSyncStatus = {
      entityType: operation.entityType,
      entityId: operation.entityId,
      publicationOperationId: operation.publicationOperationId,
      status: operation.status === "completed_with_warnings" ? "synced_with_warnings" : operation.status === "completed" ? "synced" : "pending",
      projectionVersion: Date.now(),
      cacheInvalidated: true,
      assetSyncVerified: operation.status === "completed" || operation.status === "completed_with_warnings",
      lastSyncedAt: now,
      errors: operation.errors,
      warnings: operation.warnings,
      metadata: { currentStage: operation.currentStage },
    };
    await jsonDatabase.update((data) => {
      data.publishedContentSyncStatuses = [
        ...data.publishedContentSyncStatuses.filter((item) => !(item.entityType === operation.entityType && item.entityId === operation.entityId)),
        status,
      ];
    });
    await mediaAuditPersistenceService.record("public_content_sync_completed", `Synchronized public delivery for ${operation.entityType} ${operation.entityId}`, {
      actorId: operation.requestedBy,
      entityType: "public_delivery",
      entityId: `${operation.entityType}:${operation.entityId}`,
      metadata: { publicationOperationId: operation.publicationOperationId, cacheInvalidated: true },
    });
    return status;
  }

  async listStatuses(): Promise<PublishedContentSyncStatus[]> {
    const data = await jsonDatabase.read();
    return data.publishedContentSyncStatuses;
  }

  async getHealth() {
    const statuses = await this.listStatuses();
    return {
      staleSynchronizationCount: statuses.filter((item) => item.status === "stale").length,
      failedSynchronizationCount: statuses.filter((item) => item.status === "failed").length,
      lastSuccessfulPublicationSync: statuses.filter((item) => item.status === "synced" || item.status === "synced_with_warnings").sort((a, b) => (b.lastSyncedAt ?? "").localeCompare(a.lastSyncedAt ?? ""))[0]?.lastSyncedAt,
      cache: publicContentCacheService.getCacheHealth(),
    };
  }
}

export const publishedContentSynchronizationService = new PublishedContentSynchronizationService();
