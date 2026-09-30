import type { MediaPublicationOperation, MediaPublicationOptions } from "../../models/mediaModels";
import { mediaAssetPersistenceService } from "../media/MediaAssetPersistenceService";
import { mediaAuditPersistenceService } from "../media/MediaAuditPersistenceService";
import { mediaPublicationPersistenceService } from "./MediaPublicationPersistenceService";

export class MediaPublicationRollbackService {
  async rollbackPublication(operation: MediaPublicationOperation, options: MediaPublicationOptions = {}): Promise<MediaPublicationOperation> {
    const now = new Date().toISOString();
    for (const assetId of operation.promotedAssetIds) {
      const asset = await mediaAssetPersistenceService.get(assetId);
      const previousUrl = typeof asset?.metadata?.previousPublicUrl === "string" ? asset.metadata.previousPublicUrl : undefined;
      if (asset && previousUrl) {
        await mediaAssetPersistenceService.patch(assetId, {
          url: previousUrl,
          metadata: {
            ...(asset.metadata ?? {}),
            publicationState: "rolled_back",
            rollbackOperationId: operation.publicationOperationId,
          },
        });
      }
    }
    const rolledBack = await mediaPublicationPersistenceService.updateOperation(operation.publicationOperationId, {
      status: "rolled_back",
      currentStage: "rollback",
      rolledBackAt: now,
      warnings: [...operation.warnings, ...(options.metadata?.reason ? [String(options.metadata.reason)] : [])],
    });
    await mediaAuditPersistenceService.record("media_publication_rolled_back", `Rolled back publication for ${operation.entityType} ${operation.entityId}`, {
      actorId: operation.requestedBy,
      entityType: "media_publication_operation",
      entityId: operation.publicationOperationId,
      metadata: { entityType: operation.entityType, entityId: operation.entityId },
    });
    await mediaPublicationPersistenceService.releaseLock(operation.publicationOperationId);
    return rolledBack ?? operation;
  }
}

export const mediaPublicationRollbackService = new MediaPublicationRollbackService();
